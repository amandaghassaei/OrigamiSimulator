/**
 * Created by ghassaei on 10/7/16.
 */


function initControls(globals){

    $("#logo").mouseenter(function(){
        $("#activeLogo").show();
        $("#inactiveLogo").hide();
    });
    $("#logo").mouseleave(function(){
        $("#inactiveLogo").show();
        $("#activeLogo").hide();
    });

    setLink("#about", function(){
        $('#aboutModal').modal('show');
    });

    var dynamicSimVisCallback = function(val){
        if (val) {
            $(".dynamicSim").show();
            if (globals.dynamicModel) {
                globals.dynamicModel.resume();
                globals.dynamicModel.setVisibility(true);
            }
        }
        else  {
            $(".dynamicSim").hide();
            if (globals.dynamicModel) {
                globals.dynamicModel.pause();
                globals.dynamicModel.setVisibility(false);
            }
        }
    };
    dynamicSimVisCallback(globals.dynamicSimVisible);
    setCheckbox("#dynamic", globals.dynamicSimVisible, function(val){
        globals.dynamicSimVisible = val;
        dynamicSimVisCallback(val);
    });
    setCheckbox("#static", globals.staticSimVisible, function(val){
        globals.staticSimVisible = val;
    });
    setCheckbox("#schematic", globals.schematicVisible, function(val){
        globals.schematicVisible = val;
    });

    setSliderInput("#axialStiffness", globals.axialStiffness, 1, 1000, 1, function(val){
        globals.axialStiffness = val;
        globals.dynamicModel.updateMaterials();
    });

    setSliderInput("#creaseStiffness", globals.creaseStiffness, 1, 1000, 1, function(val){
        globals.creaseStiffness = val;
        globals.dynamicModel.updateCreasesMeta();
    });

    setSliderInput("#panelStiffness", globals.panelStiffness, 1, 1000, 1, function(val){
        globals.panelStiffness = val;
        globals.dynamicModel.updateCreasesMeta();
    });

    setSlider("#damping", globals.percentDamping, 0, 1, 0.01, function(val){
        globals.percentDamping = val;
    }, function(){
        globals.dynamicModel.updateMaterials();
        globals.dynamicModel.reset();
    });

    setSliderInput("#creasePercent", globals.creasePercent, 0, 1, 0.01, function(val){
        globals.creasePercent = val;
    });

    function setDeltaT(val){
        $("#deltaT").html(val.toFixed(4));
    }

    setLink("#resetDynamicSim", function(){
        globals.dynamicModel.reset();
    });

    function setButtonGroup(id, callback){
        $(id+" a").click(function(e){
            e.preventDefault();
            var $target = $(e.target);
            var val = $target.data("id");
            if (val) {
                $(id+" span.dropdownLabel").html($target.html());
                callback(val);
            }
        });
    }

    function setLink(id, callback){
        $(id).click(function(e){
            e.preventDefault();
            callback(e);
        });
    }

    function setRadio(name, val, callback){
        $("input[name=" + name + "]").on('change', function() {
            var state = $("input[name="+name+"]:checked").val();
            callback(state);
        });
        $(".radio>input[value="+val+"]").prop("checked", true);
    }

    function setInput(id, val, callback, min, max){
        var $input = $(id);
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }
            if (min !== undefined && val < min) val = min;
            if (max !== undefined && val > max) val = max;
            $input.val(val);
            callback(val);
        });
        $input.val(val);
    }

    function setCheckbox(id, state, callback){
        var $input  = $(id);
        $input.on('change', function () {
            if ($input.is(":checked")) callback(true);
            else callback(false);
        });
        $input.prop('checked', state);
    }

    function setSlider(id, val, min, max, incr, callback, callbackOnStop){
        var slider = $(id).slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });
        slider.on("slide", function(e, ui){
            var val = ui.value;
            callback(val);
        });
        slider.on("slidestop", function(){
            var val = slider.slider('value');
            if (callbackOnStop) callbackOnStop(val);
        })
    }

    function setLogSliderInput(id, val, min, max, incr, callback){

        var scale = (Math.log(max)-Math.log(min)) / (max-min);

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: (Math.log(val)-Math.log(min)) / scale + min,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', (Math.log(val)-Math.log(min)) / scale + min);
            callback(val, id);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            val = Math.exp(Math.log(min) + scale*(val-min));
            $input.val(val.toFixed(4));
            callback(val, id);
        });
    }

    function setSliderInput(id, val, min, max, incr, callback){

        var slider = $(id+">div").slider({
            orientation: 'horizontal',
            range: false,
            value: val,
            min: min,
            max: max,
            step: incr
        });

        var $input = $(id+">input");
        $input.change(function(){
            var val = $input.val();
            if ($input.hasClass("int")){
                if (isNaN(parseInt(val))) return;
                val = parseInt(val);
            } else {
                if (isNaN(parseFloat(val))) return;
                val = parseFloat(val);
            }

            var min = slider.slider("option", "min");
            if (val < min) val = min;
            if (val > max) val = max;
            $input.val(val);
            slider.slider('value', val);
            callback(val);
        });
        $input.val(val);
        slider.on("slide", function(e, ui){
            var val = ui.value;
            $input.val(val);
            callback(val);
        });
    }

    function update(){
        function setInput(id, val){
            $(id).val(val);
        }
    }

    return {
        update:update,
        setDeltaT: setDeltaT
    }
}

