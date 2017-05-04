/**
 * Created by ghassaei on 10/7/16.
 */


function initGlobals(){

    var _globals = {

        navMode: "simulation",

        //view
        colorMode: "normal",
        color1: "ec008b",
        color2: "dddddd",
        edgesVisible: true,
        mtnsVisible: true,
        valleysVisible: true,
        panelsVisible: false,
        passiveEdgesVisible: true,
        meshVisible: true,
        ambientOcclusion: false,

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
        simType: "dynamic",

        //sim settings
        creasePercent: 0,
        axialStiffness: 2000,
        creaseStiffness: 70,
        panelStiffness: 70,

        //dynamic sim settings
        percentDamping: 1,
        density: 1,

        //import pattern settings
        vertTol: 3,//vertex merge tolerance

        //save stl settings
        filename: null,
        extension: null,
        doublesidedSTL: false

    };

    function warn(msg){
        $("#warningMessage").html(msg);
        $("#warningModal").modal("show");
    }
    _globals.warn = warn;

    function noCreasePatternAvailable(){
        return _globals.extension == "fold";
    }
    _globals.noCreasePatternAvailable = noCreasePatternAvailable;

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