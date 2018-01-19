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
            globals.Model3D.setFoldData(nextFold);
            getSolver().syncNodesAndEdges();
            globals.simNeedsSync = false;
            if (!globals.simulationRunning) resetSimulation();

            nextFold = null;
            nextCreaseParam = null;
        }
        if (globals.simNeedsSync){
            getSolver().syncNodesAndEdges();
            globals.simNeedsSync = false;
        }
        if (globals.inited && globals.simulationRunning) step();

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
        getSolver().solve(numSteps);
        render();
    }

    function render(){
        getSolver().render(globals.Model3D.getPositionsArray(), globals.Model3D.getColorsArray());
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

        loadNewData: loadNewData
    }
}