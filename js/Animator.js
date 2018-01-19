/**
 * Created by amandaghassaei on 1/17/18.
 */


function Animator(){

    var nextFold, nextCreaseParam;//next objects to load

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
            globals.model.setFoldData(nextFold, nextCreaseParam);
            getSolver().syncNodesAndEdges();
            globals.simNeedsSync = false;
            if (!globals.simulationRunning) reset();

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

    function reset(){
        getSolver().reset();
        render();
    }

    function step(numSteps){
        getSolver().solve(numSteps);
        render();
    }

    function render(){
        getSolver().render(globals.model.getPositionsArray(), globals.model.getColorsArray());
        globals.model.update(globals.userInteractionEnabled || globals.vrEnabled);
    }

    function loadNewData(fold, creaseParams){
        nextFold = fold;
        nextCreaseParam = creaseParams;
    }

    return {
        startAnimation: startAnimation,
        startSimulation: startSimulation,
        pauseSimulation: pauseSimulation,

        render: render,

        loadNewData: loadNewData
    }
}