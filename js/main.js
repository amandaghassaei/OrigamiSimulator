/**
 * Created by ghassaei on 2/22/17.
 */

globals = {};

$(function() {

    globals = initGlobals();
    globals.UI3D = init3DUI(globals);
    globals.importer = initImporter(globals);
    globals.model = initModel(globals);
    globals.staticSolver = initStaticSolver(globals);
    globals.dynamicSolver = initDynamicSolver(globals);
    globals.rigidSolver = initRigidSolver(globals);
    globals.pattern = initPattern(globals);
    globals.vive = initViveInterface(globals);
    $(".demo[data-url='Tessellations/huffmanExtrudedBoxes.svg']").click();//load demo models
});