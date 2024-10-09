import { test, expect } from "@playwright/test";
import { Helioviewer } from "../../../page_objects/helioviewer";
import { mockEvents } from "../../../utils/events";

/**
 * This test mocks CCMC events, then checks some frm and eventtype, then unchecks all
 * test validates all checkboxes are unchecked and their markers are not visible
 */
test("UncheckAll should uncheck all event markers that are previously selected also their markers should be hidden", async ({
  page,
  browser
}, info) => {
  // mocked event data
  const events = {
    CCMC: {
      DONKI: {
        CME: {
          "Type:C 11": {},
          "Type:C 12": {}
        }
      },
      "Solar Flare Predictions": {
        AMOS: {
          "C+ 34.05%": {},
          "C+ 77.15%": {}
        },
        "MAG4 Sharp FE": {
          "M: 34.05%": {},
          "M: 77.15%": {}
        }
      }
    }
  };

  // mock events
  await mockEvents(page, events);

  // load helioviewer
  let hv = new Helioviewer(page, info);

  // Action 1 : BROWSE TO HELIOVIEWER
  await hv.Load();
  await hv.CloseAllNotifications();

  // Action 2 : Open left sources panel
  await hv.OpenSidebar();

  // Assert parse CCMC tree
  const ccmcTree = hv.parseTree("CCMC");

  // Action 3 : Check DONKI
  await ccmcTree.toggleCheckEventType("DONKI");

  // Action 4 : Check AMOS
  await ccmcTree.toggleCheckFRM("Solar Flare Predictions", "AMOS");

  // Action 5 : Check M: 77.15%
  await ccmcTree.toggleBranchFRM("Solar Flare Predictions", "MAG4 Sharp FE");
  await ccmcTree.toggleCheckEventInstance("Solar Flare Predictions", "MAG4 Sharp FE", "M: 77.15%");

  // Assert all checkboxes need to be checked or not
  await ccmcTree.assertFrmNodeChecked("DONKI", "CME");
  await ccmcTree.assertFrmNodeChecked("Solar Flare Predictions", "AMOS");
  await ccmcTree.assertEventInstanceNodeChecked("DONKI", "CME", "Type:C 11");
  await ccmcTree.assertEventInstanceNodeChecked("DONKI", "CME", "Type:C 12");
  await ccmcTree.assertEventInstanceNodeChecked("Solar Flare Predictions", "AMOS", "C+ 34.05%");
  await ccmcTree.assertEventInstanceNodeChecked("Solar Flare Predictions", "AMOS", "C+ 77.15%");
  await ccmcTree.assertEventInstanceNodeChecked("Solar Flare Predictions", "MAG4 Sharp FE", "M: 77.15%");
  await ccmcTree.assertEventInstanceNodeUnchecked("Solar Flare Predictions", "MAG4 Sharp FE", "M: 34.05%");

  // Assert all checked markers need to be visible or not
  await ccmcTree.assertMarkerVisible("Type:C 11");
  await ccmcTree.assertMarkerVisible("Type:C 12");
  await ccmcTree.assertMarkerVisible("C+ 34.05%");
  await ccmcTree.assertMarkerVisible("C+ 77.15%");
  await ccmcTree.assertMarkerVisible("M: 77.15%");
  await ccmcTree.assertMarkerNotVisible("M: 34.05%");

  // Action 6 : Trigger check none
  await ccmcTree.checkNone();

  // Assert now all markers before checked now not checked
  await ccmcTree.assertFrmNodeUnchecked("DONKI", "CME");
  await ccmcTree.assertFrmNodeUnchecked("Solar Flare Predictions", "AMOS");
  await ccmcTree.assertEventInstanceNodeUnchecked("DONKI", "CME", "Type:C 11");
  await ccmcTree.assertEventInstanceNodeUnchecked("DONKI", "CME", "Type:C 12");
  await ccmcTree.assertEventInstanceNodeUnchecked("Solar Flare Predictions", "AMOS", "C+ 34.05%");
  await ccmcTree.assertEventInstanceNodeUnchecked("Solar Flare Predictions", "AMOS", "C+ 77.15%");
  await ccmcTree.assertEventInstanceNodeUnchecked("Solar Flare Predictions", "MAG4 Sharp FE", "M: 77.15%");
  await ccmcTree.assertEventInstanceNodeUnchecked("Solar Flare Predictions", "MAG4 Sharp FE", "M: 34.05%");

  // Assert all markers should be hidden
  await ccmcTree.assertMarkerNotVisible("Type:C 11");
  await ccmcTree.assertMarkerNotVisible("Type:C 12");
  await ccmcTree.assertMarkerNotVisible("C+ 34.05%");
  await ccmcTree.assertMarkerNotVisible("C+ 77.15%");
  await ccmcTree.assertMarkerNotVisible("M: 77.15%");
  await ccmcTree.assertMarkerNotVisible("M: 34.05%");
});