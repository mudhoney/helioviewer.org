/**
 * @file Contains functions for interacting with the Helioviewer UI
 */

import { Locator, Page, Info, expect } from '@playwright/test';
import { ImageLayer } from './image_layer';
import { Screenshot } from './screenshot';
import { Movie } from './movie';
import { URLShare } from './urlshare';
import { EventTree } from './event_tree';
import { VSODrawer } from './vso_drawer';
import * as fs from 'fs';

/**
 * Matches an image layer selection
 * i.e. { label: Observatory, value: SOHO }
 *      { label: Energy Band, value: 3-6keV }
 */
interface LayerSelect {
    label: string,
    value: string
};

class Helioviewer {
    info: Info | null;
    page: Page;
    sidebar: Locator;
    screenshot: Screenshot;
    movie: Movie;
    urlshare: URLShare;
    vso_drawer: VSODrawer;

    constructor(page: Page, info: Info = null) {
        this.page = page;
        this.info = info;
        this.screenshot = new Screenshot(this.page);
        this.movie = new Movie(this.page);
        this.urlshare = new URLShare(this.page);
        this.vso_drawer = new VSODrawer(this.page);
        this.sidebar = this.page.locator('#hv-drawer-left');
    }

    /**
     * Returns a handle to interact with event tree in UI
     * @param source string, ex: HEK, CCMC, RHESSI
     * @return EventTree
     */
    parseTree(source: string): EventTree {
        return new EventTree(source, this.page);
    }

    async Load(path: string = '/') {
        await this.page.goto(path);
        await this.WaitForLoadingComplete();
    }

    /**
     * Returns a handle to an Image Layer interface which can be used to
     * semantically access image layer features of helioviewer.
     * @param index Image layer index
     */
    async getImageLayer(index: number): Promise<ImageLayer> {
        // To create an ImageLayer, we need the layer's unique id which
        // is generated randomly when the page is loaded. To find the id
        // we get the appropriate element by its class name and extract
        // the randomly generated ID.

        // Gets the specified tile layer accordion reference in the sidebar
        let layer = await this.page.locator('.dynaccordion-section').nth(index);
        // Get the section's id "tile-layer-<random_id>"
        let section_id = await layer.evaluate((e) => e.id);
        // Extract the random id from the section id
        let random_id = section_id.split('-')[2];
        return new ImageLayer(this.page, random_id);
    }

    async ExpectLayerEx(index: number, name: string, selections: LayerSelect[]) {
        await expect(this.page.getByText(name, { exact: true })).toBeVisible();
        for (let i = 0; i < selections.length; i++) {
            let layer = selections[i];
            await expect(this.page.getByLabel(layer.label).nth(index)).toHaveValue(layer.value);
        }
    }

    /**
     * Expects that the given image layer index matches the given values
     * @param index Image layer index
     * @param observatory
     * @param instrument
     * @param detector
     * @param measurement
     */
    async ExpectLayer(index: number, name: string, observatory: string, instrument: string, measurement: string) {
        await this.ExpectLayerEx(index, name, [
            { label: "Observatory", value: observatory },
            { label: "Instrument", value: instrument },
            { label: "Measurement", value: measurement }
        ]);
    }

    async UseNewestImage() {
        await this.page.getByText('NEWEST', {exact : true}).click();
        await this.page.waitForTimeout(500);
    }

    /**
     * This function waits for the number of tiles on the page to not change.
     */
    private async WaitForTileCountToSettle() {
        let locators = await this.page.locator('img.tile');
        let count = (await locators.all()).length;
        let settled = false;
        while (!settled) {
            // Wait some time.
            await this.page.waitForTimeout(1000);
            // Check the number of img tags
            let next_count = (await locators.all()).length;
            // If it matches the previous count, then we're good.
            settled = (next_count == count);
            count = next_count;
        }
    }

    async WaitForImageLoad() {
        await this.WaitForTileCountToSettle();
        let locators = await this.page.locator('img.tile');
        let images = await locators.all();
        let promises = images.map(locator => locator.evaluate(img => (img as HTMLImageElement).complete || new Promise(f => img.onload = f)));
        await Promise.all(promises);
    }

    async CloseAllNotifications() {
        while ((await this.page.locator('.jGrowl-close').count()) > 0) {
            await this.page.locator('.jGrowl-close').first().click();
            await this.page.waitForTimeout(1000);
        }
    }

    /**
     * Clicks the add layer button in the image sidebar
     */
    async AddImageLayer() {
        let initial_count = await this.page.locator('.removeBtn').count();
        await this.page.getByRole('link', { name: 'Add Layer' }).click();
        await this.WaitForLoadingComplete();
        await expect(this.page.locator('.removeBtn')).toHaveCount(initial_count + 1);
        await this.WaitForLoadingComplete();
    }

    /**
     * Removes an image layer at the given index if it exists.
     * Throws an error if the button can't be found
     */
    async RemoveImageLayer(index: number) {
        let count = await this.page.locator('.removeBtn').count();
        await this.page.locator('.removeBtn').nth(index).click();
        await expect(this.page.locator('.removeBtn')).toHaveCount(count - 1);
        await this.WaitForLoadingComplete();
    }

    /**
     * Clicks the datasources tab to open/close the sidebar
     */
    async ClickDataSourcesTab() {
        await this.page.locator('#hv-drawer-tab-left').click();
    }

    /**
     * Returns true of the sidebar is open, else returns false.
     */
    async IsSidebarOpen(): Promise<boolean> {
        let width = (await this.sidebar.evaluate((html) => html.style.width)).trim();
        // If the sidebar has never been opened, the width will be ''
        // If it was opened and closed, the width will be 0px.
        if (width === '' || width === '0px') {
            return false;
        }
        return true;
    }

    /**
     * @returns True if the sidebar is closed, else False
     */
    async IsSidebarClosed(): Promise<boolean> {
        return !(await this.IsSidebarOpen());
    }

    /**
     * Opens the sidebar if it is closed.
     * If the sidebar is open, this function has no effect.
     */
    async OpenSidebar() {
        if (await this.IsSidebarClosed()) {
            this.ClickDataSourcesTab();
            await expect(this.sidebar).toHaveAttribute("style", /^.*width: 27em.*$/);
        }
    }

    /**
     * Closes the sidebar if it is opened.
     * If the sidebar is closed, this function has no effect.
     */
    async CloseSidebar() {
        if (await this.IsSidebarOpen()) {
            this.ClickDataSourcesTab();
            await expect(this.sidebar).toHaveAttribute("style", /^.*width: 0px.*$/);
        }
    }

    /**
     * Waits for the loading spinner to disappear
     */
    async WaitForLoadingComplete() {
        await this.page.waitForFunction(() => document.getElementById('loading')?.style.display == "none", null, {timeout: 60000});
        await this.WaitForImageLoad();
    }

    /**
     *
     * @param n Number of times to zoom in
     */
    async ZoomIn(n: number = 1) {
        for (let i = 0; i < n; i++) {
            await this.page.locator('#zoom-in-button').click();
            // Wait for zoom animation to complete.
            await this.page.waitForTimeout(500);
        }
    }

    async ZoomOut(n: number = 1) {
        for (let i = 0; i < n; i++) {
            await this.page.locator('#zoom-out-button').click();
            // Wait for zoom animation to complete.
            await this.page.waitForTimeout(500);
        }
    }

    /**
     * Assert some certain notification is visible to the application user
     * @param type string, this can be one of the "warn", "error", "info", "success"
     * @param message string this is the notification message you want to assert
     * @return void
     */
    async assertNotification(type: string, message:string) {
        await expect(this.page.locator('div.jGrowl-notification.'+type+' > div.jGrowl-message').getByText(message)).toBeVisible();
    }

    /*
    * Opens the presets menu and selects the given preset and waits for layers to load.
    * @param preset string - The name of the preset to be selected.
    * @returns void
    */
    async SelectImagePreset(preset: string) {
        await this.page.locator('.layersPresetsList .dropdown-main').click();
        await this.page.getByRole('link', { name: preset }).click();
        await this.WaitForLoadingComplete();
    }

    /**
    * Sets observation datetime of Helioviewer from given Date object, 
    * @param Date date - The date object , to be used to load observation datetime.
    * @returns void 
    */
    async SetObservationDateTimeFromDate(date: Date): void {

        const dateParts = date.toISOString().split('T')[0].split('-')
        const dateString = `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`

        const timeParts = date.toISOString().split('T')[1].split(':')
        const timeSeconds = timeParts[2].split('.')[0];
        const timeString = `${timeParts[0]}:${timeParts[1]}:${timeSeconds}`

        await this.SetObservationDateTime(dateString, timeString);
    }

    /**
    * Sets the observation datetime and waits helioviewer to load,
    * @param string date - The date to be entered in the format 'MM/DD/YYYY'.
    * @param string time - The time to be entered in the format 'HH:MM'.
    * @returns void - A promise that resolves when the date and time have been successfully entered.
    */
    async SetObservationDateTime(date, time) {
        await this.OpenSidebar();
        await this.page.getByLabel('Observation date', { exact: true }).click();
        await this.page.getByLabel('Observation date', { exact: true }).fill(date);

        // await this.page.getByLabel('Observation date', { exact: true }).press('Enter');
        // await this.page.getByLabel('Observation date', { exact: true }).press('Enter');

        await this.page.getByLabel('Observation time').click();
        await this.page.getByLabel('Observation time').fill(time);
        await this.page.getByLabel('Observation time').press('Enter');
    }

    /**
     * Hover mouse on helioviewer logo
    *  @returns void - A promise that indicates , mouse is already hovered on our logo
     */
    async HoverOnLogo() {
        await this.page.locator('#logo').hover();
    }

    /**
    * Get the loaded date in helioviewer 
    * @returns Date|null - Loaded date of helioviewer, it can be null if any error.
    */
    async GetLoadedDate(): Date|null {

        const currentDate = await this.page.getByLabel('Observation date', {exact:true}).inputValue();
        const currentTime = await this.page.getByLabel('Observation time', {exact:true}).inputValue();

        const date = new Date(currentDate +' '+ currentTime);

        if (isNaN(date.getTime())) {
            return null;
        }

        return date
    }

    /**
    * Jump backwards with jump button, 
    * @param integer seconds, interval in seconds 
    * @returns void
    */
    async JumpBackwardsDateWithSelection(seconds: integer): void {
        await this.OpenSidebar();
        await this.page.getByLabel('Jump:').selectOption(seconds.toString());
        await this.page.locator('#timeBackBtn').click();
    }

    /**
    * Jump forward with jump button, 
    * @param integer seconds, interval in seconds 
    * @returns void
    */
    async JumpForwardDateWithSelection(seconds: integer): void {
        await this.OpenSidebar();
        await this.page.getByLabel('Jump:').selectOption(seconds.toString());
        await this.page.locator('#timeForwardBtn').click();
    }

    /**
    * Get base64 screenshot data of given page, 
    * @param options JSON | pass options to playwright screenshot function  
    * @returns string | base64 represation of binary screenshot
    */
    async getBase64Screenshot(options: JSON = {}): string {
        // stay on logo to not generate 
        // await this.HoverOnLogo();
        const binaryImage = await this.page.locator('#helioviewer-viewport-container-outer').screenshot(options);
        return binaryImage.toString('base64');
    }

    /**
    * Attach base64 content with a filepath to trace report 
    * @param info Info | playwright info object where we can attach files  
    * @param content string | base64 representation of file
    * @param name string | name of file in trace report
    * @returns void
    */
    async attachBase64FileToTrace(filename: string, contents: string): void {
      const filepath = this.info.outputPath(filename);
      await fs.promises.writeFile(filepath, Buffer.from(contents, 'base64'));
      await this.info.attach(filename, { path: filepath });
    }


    /**
    * @param options JSON | pass options to playwright screenshot function  
    * @returns void
    */
    async pre(filename: string = "", options: JSON = {}): void {
      await this.pr(filename, options);
      expect("true").toBe("!false");
    }

    /**
    * @param options JSON | pass options to playwright screenshot function  
    * @returns void
    */
    async pr(filename: string = "", options: JSON = {}): void {
      const debugScreenshot = await this.getBase64Screenshot({});
      
      if (filename == "") {
        filename = (Math.random() + 1).toString(36).substring(7) + ".png";
      } 
      await this.attachBase64FileToTrace(filename, debugScreenshot)
    }
}

export { Helioviewer }
