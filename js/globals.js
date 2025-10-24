/**
 * Created by ghassaei on 10/7/16.
 */


function initGlobals(){

    var _globals = {

        navMode: "simulation",
        scale: 1,

        //view
        colorMode: "color",
        calcFaceStrain: false,
        color1: "FFBDED",
        color2: "FDFFC7",
        edgesVisible: true,
        mtnsVisible: true,
        valleysVisible: true,
        panelsVisible: false,
        passiveEdgesVisible: false,
        boundaryEdgesVisible: true,
        meshVisible: true,
        ambientOcclusion: false,

        //flags
        simulationRunning: true,
        fixedHasChanged: false,
        forceHasChanged: false,
        materialHasChanged: false,
        creaseMaterialHasChanged: false,
        shouldResetDynamicSim: false,//not used
        shouldChangeCreasePercent: false,
        nodePositionHasChanged: false,
        shouldZeroDynamicVelocity: false,
        shouldCenterGeo: false,
        needsSync: false,
        simNeedsSync: false,

        menusVisible: true,

        url: null,

        //3d vis
        simType: "dynamic",

        //compliant sim settings
        creasePercent: 0.6,
        axialStiffness: 20,
        creaseStiffness: 0.7,
        panelStiffness: 0.7,
        faceStiffness: 0.2,

        //dynamic sim settings
        percentDamping: 0.45,//damping ratio
        density: 1,
        integrationType: "euler",

        strainClip: 5.0,//for strain visualization, % strain that is drawn red

        //import pattern settings
        vertTol: 3,//vertex merge tolerance
        foldUseAngles: true,//import current angles from fold format as target angles
        //for curved folding
        includeCurves: false,
        vertInt: 20,//intervals of vertices for discretization
        apprCurve: 0.2,//approximation quality of curves

        //save stl settings
        filename: null,
        extension: null,
        doublesidedSTL: false,
        doublesidedOBJ: false,
        exportScale: 1,
        thickenModel: true,
        thickenOffset: 5,
        polyFacesOBJ: true,

        //save fold settings
        foldUnits: "unit",
        triangulateFOLDexport: false,
        exportFoldAngle: true,

        pausedForPatternView: false,

        userInteractionEnabled: false,
        vrEnabled: false,

        numSteps: 100,

        rotateModel: null,
        rotationSpeed: 0.01,

        backgroundColor:"ffffff",

        capturer: null,
        capturerQuality: 63,
        capturerFPS: 60,
        gifFPS: 20,
        currentFPS: null,
        capturerScale: 1,
        capturerFrames: 0,
        shouldScaleCanvas: false,
        isGif: false,
        shouldAnimateFoldPercent: false,

        keyframeCount: 6,
        keyframes: [],
        currentKeyframeIndex: 0,
        currentFoldPercent: 0,
    };

    function clip(x, min, max){
        return Math.max(Math.min(x, max), min);
    }
    
    function buildKeyframes(count){
        var frames = [];
        var segments = Math.max(count - 1, 1);
        for (var i = 0; i < count; i++){
            frames.push(i / segments);
        }
        return frames;
    }
    _globals.buildKeyframes = buildKeyframes;
    _globals.keyframes = buildKeyframes(_globals.keyframeCount);

    function updateCreasePercentFromState(){
        _globals.currentKeyframeIndex = clip(_globals.currentKeyframeIndex, 0, _globals.keyframeCount - 1);
        _globals.currentFoldPercent = clip(_globals.currentFoldPercent, 0, 1);
        var start = _globals.keyframes[_globals.currentKeyframeIndex];
        var end = (_globals.currentKeyframeIndex == _globals.keyframes.length - 1) ? 1 :_globals.keyframes[_globals.currentKeyframeIndex + 1];
        _globals.creasePercent = clip(start + (end - start) * _globals.currentFoldPercent, 0, 1);
    }
    _globals.updateCreasePercentFromState = updateCreasePercentFromState;

    function updateFoldFrameFromCreasePercent(){
        if (_globals.creasePercent === 1) {
            _globals.currentKeyframeIndex = _globals.keyframes.length - 1;
            _globals.currentFoldPercent = 1;
            return;
        }
        for (var i = 0; i < _globals.keyframes.length - 1; i++){
            var start = _globals.keyframes[i];
            var end = _globals.keyframes[i + 1];
            if (_globals.creasePercent >= start && _globals.creasePercent < end){
                _globals.currentKeyframeIndex = i;
                _globals.currentFoldPercent = (_globals.creasePercent - start) / (end - start);
                return;
            }
        }
    }

    function directlySetCreasePercent(percent){
        _globals.creasePercent = clip(percent, -1, 1);
        updateFoldFrameFromCreasePercent();
    }
    _globals.directlySetCreasePercent = directlySetCreasePercent;

    function setCreasePercent(percent){
        _globals.creasePercent = percent;
        percent *= 100;
        $("#creasePercent>div").slider({value:percent});
        $("#creasePercent>input").val(percent.toFixed(0));
        $("#creasePercentNav>div").slider({value:percent});
        $("#creasePercentBottom>div").slider({value:percent});
    }
    _globals.setCreasePercent = setCreasePercent;

    function warn(msg){
        if (($("#warningMessage").html()) != "") $("#warningMessage").append("<br/><hr>" + msg);
        else $("#warningMessage").html(msg);
        if (!$('#warningModal').hasClass('show')) $("#warningModal").modal("show");
    }
    $('#warningModal').on('hidden.bs.modal', function () {
        $("#warningMessage").html("");
    });
    _globals.warn = warn;

    function noCreasePatternAvailable(){
        return $("#svgViewer>svg").length == 0;
    }
    _globals.noCreasePatternAvailable = noCreasePatternAvailable;

    return _globals;
}