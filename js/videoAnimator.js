/**
 * Created by amandaghassaei on 7/2/17.
 */


function initVideoAnimator(globals){

    var foldAngleSequence = [];

    function compile(){
        var lastAngle = globals.creasePercent*100;
        var t = 0;
        for (var i=0;i<foldAngleSequence.length;i++){
            var item = foldAngleSequence[i];
            item.t = t;
            item.from = lastAngle;
            if (item.type == "delay") item.to = lastAngle;
            lastAngle = item.to;
            t += item.dur;
        }
    }

    function nextFoldAngle(stepNum){
        var fps = globals.currentFPS;
        var frame = globals.capturerFrames + stepNum/globals.numSteps;
        var t = frame/fps;
        var item = getItemForT(t);
        if (item === null) {
            globals.shouldAnimateFoldPercent = false;
            return globals.creasePercent;
        }
        if (item.dur == 0) return item.to/100;
        t -= item.t;
        t /= item.dur;
        var angle = item.from*(1-t) + item.to*t;
        return angle/100;
    }

    function getItemForT(t){
        for (var i=0;i<foldAngleSequence.length;i++){
            var item = foldAngleSequence[i];
            if (t <= item.t + item.dur) return item;
        }
        return null;
    }

    function addItem(){
        foldAngleSequence.push({
            type:"animation",
            dur: null,
            from: null,
            to: null
        });
        render();
    }

    function addDelay(){
        foldAngleSequence.push({
            type:"delay",
            dur:null,
            from: null,
            to: null
        });
        render();
    }

    function isValid(){
        if (foldAngleSequence.length == 0) return false;
        for (var i=0;i<foldAngleSequence.length;i++){
            var item = foldAngleSequence[i];
            if (item.type == "delay" && item.dur !== null) continue;
            if (item.type == "animation" && item.dur !== null && item.to != null) continue;
            return false
        }
        return true;
    }

    function setAnimationStatus(){
        if (foldAngleSequence.length == 0) {
            $("#foldPercentAnimationStatus").removeClass("warning");
            $("#foldPercentAnimationStatus").html("no animation configured");
            return;
        }
        if (isValid()) {
            $("#foldPercentAnimationStatus").removeClass("warning");
            $("#foldPercentAnimationStatus").html("animation configured");
        } else {
            $("#foldPercentAnimationStatus").addClass("warning");
            $("#foldPercentAnimationStatus").html("incomplete config, will be ignored");
        }
    }

    function render(){
        setAnimationStatus();
        var html = "";
        if (foldAngleSequence.length == 0){
            $("#animationSetupHelp").html("No animation items in sequence.");
            $("#animationHTML").html("");
            return;
        }
        for (var i=0;i<foldAngleSequence.length;i++){
            if (foldAngleSequence[i].type == "delay") html += renderDelay(foldAngleSequence[i], i);
            else html += renderItem(foldAngleSequence[i], i);
        }
        $("#animationSetupHelp").html("Configure automatic <b>Fold Percent</b> control:");
        $("#animationHTML").html(html);

        //bind events
        $(".deleteItem").click(function(e){
            e.preventDefault();
            var $target = $(e.target);
            var index = $target.data("index");
            if (index === undefined) index = $target.parent(".deleteItem").data("index");
            foldAngleSequence.splice(index, 1);
            render();
        });
        $(".durVal").change(function(e){
            var $input = $(e.target);
            var val = $input.val();
            if (isNaN(parseFloat(val))) return;
            val = parseFloat(val);
            if (val < 0) val = 0;
            $input.val(val);
            var index = $input.data("index");
            foldAngleSequence[index].dur = val;
            render();
        });
        $(".toVal").change(function(e){
            var $input = $(e.target);
            var val = $input.val();
            if (isNaN(parseFloat(val))) return;
            val = parseFloat(val);
            if (val < -100) val = -100;
            if (val > 100) val = 100;
            $input.val(val);
            var index = $input.data("index");
            foldAngleSequence[index].to = val;
            render();
        });
    }

    function renderItem(item, index){
        var dur = "";
        if (item.dur !== null) dur = item.dur;
        var to = "";
        if (item.to !== null) to = item.to;
        return '<li class="animationStep">Animate to &nbsp;' +
            '<input value="' + to + '" placeholder="Target" data-index="'+index+'" class="toVal float form-control" type="text">' +
            ' % for &nbsp;' +
            '<input value="' + dur + '" placeholder="Duration" data-index="'+index+'" class="durVal float form-control" type="text">' +
            '&nbsp; seconds &nbsp;&nbsp;&nbsp;' +
            '<a href="#" data-index="'+index+'" class="red deleteItem"><span data-index="'+index+'" class="fui-cross"></span></a>' +
            '</li>';
    }

    function renderDelay(delay, index){
        var dur = "";
        if (delay.dur !== null) dur = delay.dur;
        return '<li class="animationStep">Wait for &nbsp;' +
            '<input value="' + dur + '" placeholder="Duration" data-index="'+index+'" class="durVal float form-control" type="text">' +
            '&nbsp; seconds &nbsp;&nbsp;&nbsp;' +
            '<a href="#" data-index="'+index+'" class="red deleteItem"><span class="fui-cross"></span></a>' +
            '</li>';
    }

    render();

    return {
        addItem: addItem,
        addDelay: addDelay,
        isValid: isValid,
        compile: compile,
        nextFoldAngle: nextFoldAngle
    }
}