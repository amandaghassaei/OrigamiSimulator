/**
 * Created by ghassaei on 10/7/16.
 */


function initGlobals(){

    var _globals = {

        //flags
        fixedHasChanged: false,
        forceHasChanged: false,
        materialHasChanged: false,
        creaseMaterialHasChanged: false,
        shouldResetDynamicSim: false,
        shouldChangeCreasePercent: false,
        shouldSyncWithModel: false,
        nodePositionHasChanged: false,

        //3d vis
        dynamicSimVisible: true,
        staticSimVisible: false,
        schematicVisible: true,

        //sim settings
        creasePercent: 0,
        axialStiffness: 100,
        creaseStiffness: 10,
        panelStiffness: 1,

        //dynamic sim settings
        percentDamping: 1,
        density: 1,

        //import pattern settings
        vertTol: 0.01//vertex merge tolerange

    };

    var isMobile = {
        Android: function() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry: function() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS: function() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera: function() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows: function() {
            return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
        },
        any: function() {
            return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
        }
    };
    if(isMobile.any()) _globals.dynamicSimVisible = false;

    _globals.threeView = initThreeView(_globals);
    _globals.controls = initControls(_globals);

    return _globals;
}