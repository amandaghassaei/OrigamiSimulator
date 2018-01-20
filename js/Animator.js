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
            var scaledFold = globals.Model3D.setFoldData(nextFold);
            getSolver().setFoldData(scaledFold);
            globals.simNeedsSync = false;
            if (!globals.simulationRunning) resetSimulation();

            nextFold = null;
        }
        if (globals.simNeedsSync){
            getSolver().setFoldData();
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
        getSolver().step(numSteps);
        render();
    }

    function render(){
        getSolver().updateModel3D(globals.Model3D);
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

        loadNewData: loadNewData
    }
}