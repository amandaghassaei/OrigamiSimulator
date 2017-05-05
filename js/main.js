/**
 * Created by ghassaei on 2/22/17.
 */

globals = {};

$(function() {

    window.addEventListener('resize', function(){
        globals.threeView.onWindowResize();
    }, false);

    globals = initGlobals();
    globals.UI3D = init3DUI(globals);
    globals.model = initModel(globals);
    globals.staticSolver = initStaticSolver(globals);
    globals.dynamicSolver = initDynamicSolver(globals);
    globals.pattern = initPattern(globals);
    $(".demo[data-url='Tessellations/waterbomb.svg']").click();
});