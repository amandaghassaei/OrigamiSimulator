/**
 * Created by ghassaei on 2/22/17.
 */

globals = {};

window.addEventListener("load", () => {
  globals = initGlobals();
  globals.threeView = initThreeView(globals);
  globals.controls = initControls(globals);
  // globals.UI3D = init3DUI(globals);
  // globals.importer = initImporter(globals);
  globals.model = initModel(globals);
  globals.dynamicSolver = initDynamicSolver(globals);
  globals.pattern = initPattern(globals);
  // globals.vive = initViveInterface(globals);
  // globals.videoAnimator = initVideoAnimator(globals);
});
