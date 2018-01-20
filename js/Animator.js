/**
 * Created by amandaghassaei on 1/17/18.
 */


function Animator(){

    var nextFold;//next objects to load

    startAnimation();

    function startAnimation(){
        console.log("starting animation");
        globals.threeView.renderer.animate(_loop);
    }

    function pauseSimulation(){
        globals.simulationRunning = false;
        console.log("pausing simulation");
    }

    function startSimulation(){
        console.log("starting simulation");
        globals.simulationRunning = true;
    }

    function _loop(){
        if (nextFold){
            var scaledFold = globals.Model3D.setFold(nextFold);
            globals.inited = true;
            getSolver().setFold(scaledFold);
            globals.simNeedsSync = false;
            if (!globals.simulationRunning) resetSimulation();

            nextFold = null;
        }
        if (globals.simNeedsSync){
            getSolver().setFold();
            globals.simNeedsSync = false;
        }
        if (globals.inited && globals.simulationRunning) step(globals.numSteps);

        globals.threeView.render();
    }

    function getSolver(){
        return globals.dynamicSolver;
        // if (globals.simType == "dynamic") return globals.dynamicSolver;
        // else if (globals.simType == "static") return globals.staticSolver;
        // return globals.rigidSolver;
    }

    function resetSimulation(){
        getSolver().reset();
        render();
    }

    function step(numSteps){
        var params = {
            numSteps: numSteps,
            integrationType: globals.integrationType
        };
        if (globals.shouldAnimateFoldPercent){
            globals.creasePercent = globals.videoAnimator.nextFoldAngle(0);
            globals.controls.updateCreasePercent();
            globals.shouldChangeCreasePercent = true;
        }
        if (globals.shouldChangeCreasePercent) {
            getSolver().setCreasePercent(globals.creasePercent);
            globals.shouldChangeCreasePercent = false;
        }

        if (globals.shouldCenterGeo){
            var centerPosition = globals.Model3D.calculateGeometryCenter();
            getSolver().reCenter(centerPosition);
            globals.shouldCenterGeo = false;
        }

        getSolver().stepForward(params);
        render();
    }

    function render(){
        getSolver().updateModel3DGeometry(globals.Model3D, {colorMode:globals.colorMode, strainClip:globals.strainClip});
        globals.Model3D.update(globals.userInteractionEnabled || globals.vrEnabled);
    }

    function loadNewData(fold){
        nextFold = fold;
    }

    return {
        startAnimation: startAnimation,
        startSimulation: startSimulation,
        pauseSimulation: pauseSimulation,
        resetSimulation: resetSimulation,

        render: render,
        step: step,

        getSolver: getSolver,

        loadNewData: loadNewData
    }
}