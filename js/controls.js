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
    setLink("#tips", function(){
        $('#tipsModal').modal('show');
    });

    setLink("#exportFOLD", function(){
        updateDimensions();
        $("#foldFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
        var units = globals.foldUnits;
        if (units == "unit") units = "unitless";
        $(".unitsDisplay").html(units);
        $('#exportFOLDModal').modal('show');
    });
    setLink("#exportSTL", function(){
        updateDimensions();
        $("#stlFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
        $('#exportSTLModal').modal('show');
    });
    setInput(".exportScale", globals.exportScale, function(val){
        globals.exportScale = val;
        updateDimensions();
    }, 0);
    function updateDimensions(){
        var dim = globals.model.getDimensions();
        dim.multiplyScalar(globals.exportScale/globals.scale);
        $(".exportDimensions").html(dim.x.toFixed(2) + " x " + dim.y.toFixed(2) + " x " + dim.z.toFixed(2));
    }
    setCheckbox("#doublesidedSTL", globals.doublesidedSTL, function(val){
        globals.doublesidedSTL = val;
    });
    setLink(".units", function(e){
        var units = $(e.target).data("id");
        globals.foldUnits = units;
        if (units == "unit") units = "unitless";
        $(".unitsDisplay").html(units);
    });
    setCheckbox("#triangulateFOLDexport", globals.triangulateFOLDexport, function(val){
        globals.triangulateFOLDexport = val;
    });

    setLink("#doSTLsave", function(){
        saveSTL();
    });
    setLink("#doFOLDsave", function(){
        saveFOLD();
    });

    setLink("#navPattern", function(){
        if (globals.noCreasePatternAvailable()){
            globals.warn("No crease pattern available for FOLD format.");
            return;
        }
        globals.navMode = "pattern";
        $("#navPattern").parent().addClass("open");
        $("#navSimulation").parent().removeClass("open");
        $("#svgViewer").show();
    });
    $("#navSimulation").parent().addClass("open");
    $("#navPattern").parent().removeClass("open");
    setLink("#navSimulation", function(){
        globals.navMode = "simulation";
        $("#navSimulation").parent().addClass("open");
        $("#navPattern").parent().removeClass("open");
        $("#svgViewer").hide();
    });

    setCheckbox("#dynamic", globals.simType == "dynamic", function(val){
        globals.simType = val;
    });
    setCheckbox("#static", globals.simType == "static", function(val){
        globals.simType = val;
    });
    setCheckbox("#schematic", globals.schematicVisible, function(val){
        globals.schematicVisible = val;
    });

    setRadio("simType", globals.simType, function(val){
        globals.simType = val;
    });

    setSliderInput("#axialStiffness", globals.axialStiffness, 1000, 4000, 1, function(val){
        globals.axialStiffness = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#creaseStiffness", globals.creaseStiffness, 0, 100, 1, function(val){
        globals.creaseStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#panelStiffness", globals.panelStiffness, 0, 100, 1, function(val){
        globals.panelStiffness = val;
        globals.creaseMaterialHasChanged = true;
    });

    setSliderInput("#percentDamping", globals.percentDamping, 0.1, 1, 0.01, function(val){
        globals.percentDamping = val;
        globals.materialHasChanged = true;
    });

    setSliderInput("#creasePercent", globals.creasePercent, -1, 1, 0.01, function(val){
        globals.creasePercent = val;
        globals.shouldChangeCreasePercent = true;
    });

    function setDeltaT(val){
        $("#deltaT").html(val.toFixed(4));
    }

    setLink("#resetDynamicSim", function(){
        globals.shouldResetDynamicSim = true;
    });

    setLink(".loadFile", function(e){
        $("#fileSelector").click();
        $(e.target).blur();
    });

    setLink(".demo", function(e){
        var url = $(e.target).data("url");
        if (url) {
            globals.importer.importDemoFile(url);
        }
    });

    setLink("#saveSVGScreenshot", function(){
        globals.threeView.saveSVG();
    });

    setLink("#saveSVG", function(){
        globals.pattern.saveSVG();
    });

    setCheckbox("#ambientOcclusion", globals.ambientOcclusion, function(val){
        globals.ambientOcclusion = val;
    });

    if (globals.colorMode == "color") $("#coloredMaterialOptions").show();
    else $("#coloredMaterialOptions").hide();
    if (globals.colorMode == "axialStrain") $("#axialStrainMaterialOptions").show();
    else $("#axialStrainMaterialOptions").hide();
    setRadio("colorMode", globals.colorMode, function(val){
        globals.colorMode = val;
        if (val == "color") $("#coloredMaterialOptions").show();
        else $("#coloredMaterialOptions").hide();
        if (val == "axialStrain") $("#axialStrainMaterialOptions").show();
        else $("#axialStrainMaterialOptions").hide();
        globals.model.setMeshMaterial();
    });

    setHexInput("#color1", globals.color1, function(val){
        globals.color1 = val;
        globals.model.setMeshMaterial();
    });
    setHexInput("#color2", globals.color2, function(val){
        globals.color2 = val;
        globals.model.setMeshMaterial();
    });

    setCheckbox("#edgesVisible", globals.edgesVisible, function(val){
        globals.edgesVisible = val;
        if (globals.edgesVisible) $("#edgeVisOptions").show();
        else $("#edgeVisOptions").hide();
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#mtnsVisible", globals.mtnsVisible, function(val){
        globals.mtnsVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#valleysVisible", globals.valleysVisible, function(val){
        globals.valleysVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#panelsVisible", globals.panelsVisible, function(val){
        globals.panelsVisible = val;
        globals.model.updateEdgeVisibility();
    });
    setCheckbox("#passiveEdgesVisible", globals.passiveEdgesVisible, function(val){
        globals.passiveEdgesVisible = val;
        globals.model.updateEdgeVisibility();
    });

    setCheckbox("#meshVisible", globals.meshVisible, function(val){
        globals.meshVisible = val;
        globals.model.updateMeshVisibility();
        if (globals.meshVisible) $("#meshMaterialOptions").show();
        else $("#meshMaterialOptions").hide();
    });

    setLink("#aboutError", function(){
        $("#aboutErrorModal").modal("show");
    });
    setLink("#aboutStiffness", function(){
        $("#aboutStiffnessModal").modal("show");
    });
    setLink("#aboutDynamicSim", function(){
        $("#aboutDynamicSimModal").modal("show");
    });
    setLink("#aboutStaticSim", function(){
        $("#aboutStaticSimModal").modal("show");
    });
    setLink("#aboutAxialStrain", function(){
        $("#aboutAxialStrainModal").modal("show");
    });

    setLink("#start", function(){
        $("#pause").show();
        $("#reset").show();
        $("#start").hide();
        $("#stepForwardOptions").hide();
        globals.model.resume();
    });
    setLink("#pause", function(){
        $("#start").show();
        $("#stepForwardOptions").show();
        $("#pause").hide();
        globals.model.pause();
    });
    setLink("#reset", function(){
        if (!globals.threeView.running()) $("#reset").hide();
        globals.model.reset();
    });
    setLink("#stepForward", function(){
        var numSteps = $("#numSteps").val();
        numSteps = parseInt(numSteps);
        if (isNaN(numSteps)) return;
        if (numSteps<=0) return;
        $("#numSteps").val(numSteps);
        globals.model.step(numSteps);
    });

    setInput("#strainClip", globals.strainClip, function(val){
        globals.strainClip = val;
    }, 0.0001, 100);

    setCheckbox($("#userInteractionEnabled"), globals.userInteractionEnabled, function(val){
        globals.userInteractionEnabled = val;
        if (!val) globals.UI3D.hideHighlighters();
    });

    setCheckbox($("#foldUseAngles"), globals.foldUseAngles, function(val){
        globals.foldUseAngles = val;
    });

    setLink("#shouldCenterGeo", function(){
        globals.shouldCenterGeo = true;
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
            } else if ($input.hasClass("text")){
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

    function setHexInput(id, val, callback){
        var $input = $(id);
        $input.css({"border-color": "#" + val});
        $input.change(function(){
            var val = $input.val();
            var validHex  = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(val);
            if (!validHex) return;
            $input.val(val);
            $input.css({"border-color": "#" + val});
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

