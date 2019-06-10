/**
 * Created by ghassaei on 10/7/16.
 */


function initControls(globals) {

  window.addEventListener("resize", function() {
    if (globals.capturer) return;
    globals.threeView.onWindowResize();
    updateCanvasDimensions();
  }, false);

  $("#logo").mouseenter(function() {
    $("#activeLogo").show();
    $("#inactiveLogo").hide();
  });
  $("#logo").mouseleave(function() {
    $("#inactiveLogo").show();
    $("#activeLogo").hide();
  });


  setLink("#menuVis", function() {
    if (globals.menusVisible) {
      $("#controls").fadeOut();
      $("#controlsLeft").fadeOut();
      $("#creasePercentNav").fadeIn();
    } else {
      $("#controls").fadeIn();
      $("#controlsLeft").fadeIn();
      $("#creasePercentNav").fadeOut();
    }
    globals.menusVisible = !globals.menusVisible;
  });
  $("#controls").fadeIn();

  setLink("#cameraX", function() {
    globals.threeView.setCameraX(1);
  });
  setLink("#cameraY", function() {
    globals.threeView.setCameraY(1);
  });
  setLink("#cameraZ", function() {
    globals.threeView.setCameraZ(1);
  });
  setLink("#cameraMinusX", function() {
    globals.threeView.setCameraX(-1);
  });
  setLink("#cameraMinusY", function() {
    globals.threeView.setCameraY(-1);
  });
  setLink("#cameraMinusZ", function() {
    globals.threeView.setCameraZ(-1);
  });
  setLink("#cameraIso", function() {
    globals.threeView.setCameraIso();
  });

  setLink("#exportFOLD", function() {
    updateDimensions();
    $("#foldFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
    var units = globals.foldUnits;
    if (units == "unit") units = "unitless";
    $(".unitsDisplay").html(units);
    $('#exportFOLDModal').modal('show');
  });
  setLink("#exportSTL", function() {
    updateDimensions();
    $("#stlFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
    $('#exportSTLModal').modal('show');
  });
  setLink("#exportOBJ", function() {
    updateDimensions();
    $("#objFilename").val(globals.filename + " : " + parseInt(globals.creasePercent*100) +  "PercentFolded");
    $('#exportOBJModal').modal('show');
  });
  setInput(".exportScale", globals.exportScale, function(val) {
    globals.exportScale = val;
    updateDimensions();
  }, 0);
  function updateDimensions() {
    var dim = globals.model.getDimensions();
    dim.multiplyScalar(globals.exportScale/globals.scale);
    $(".exportDimensions").html(dim.x.toFixed(2) + " x " + dim.y.toFixed(2) + " x " + dim.z.toFixed(2));
  }
  setCheckbox("#doublesidedSTL", globals.doublesidedSTL, function(val) {
    globals.doublesidedSTL = val;
  });
  setCheckbox("#doublesidedOBJ", globals.doublesidedOBJ, function(val) {
    globals.doublesidedOBJ = val;
  });
  setCheckbox("#polyFacesOBJ", globals.polyFacesOBJ, function(val) {
    globals.polyFacesOBJ = val;
  });
  setLink(".units", function(e) {
    var units = $(e.target).data("id");
    globals.foldUnits = units;
    if (units == "unit") units = "unitless";
    $(".unitsDisplay").html(units);
  });
  setCheckbox("#triangulateFOLDexport", globals.triangulateFOLDexport, function(val) {
    globals.triangulateFOLDexport = val;
  });
  setCheckbox("#exportFoldAngle", globals.exportFoldAngle, function(val) {
    globals.exportFoldAngle = val;
  });

  setLink("#doSTLsave", function() {
    saveSTL();
  });
  setLink("#doOBJsave", function() {
    saveOBJ();
  });
  setLink("#doFOLDsave", function() {
    saveFOLD();
  });

  // setHexInput("#backgroundColor", globals.backgroundColor, function(val) {
  //     globals.backgroundColor = val;
  //     globals.threeView.setBackgroundColor();
  // });

  setLink("#importSettings", function() {
    $("#vertTol").val(globals.vertTol);
    $("#importSettingsModal").modal("show");
  });
  setInput("#vertTol", globals.vertTol, function(val) {
    globals.vertTol = val;
  });

  function updateCanvasDimensions() {
    var dim = (new THREE.Vector2(window.innerWidth, window.innerHeight)).multiplyScalar(globals.capturerScale);
    $("#canvasDimensions").html(dim.x + " x " + dim.y + " px");
  }

  setLink(".seeMore", function(e) {
    var $target = $(e.target);
    if (!$target.hasClass("seeMore")) $target = $target.parent();
    var $div = $("#"+ $target.data("id"));
    if ($target.hasClass("closed")) {
      $target.removeClass("closed");
      $target.addClass("open");
      AnimateRotate(-90, 0, $target.children("span"));
      $div.removeClass("hide");
      $div.css('display', 'inline-block');
    } else {
      $target.removeClass("open");
      $target.addClass("closed");
      AnimateRotate(0, -90, $target.children("span"));
      $div.hide();
    }
  });

  function AnimateRotate(from, to, $elem) {
    // we use a pseudo object for the animation
    // (starts from `0` to `angle`), you can name it as you want
    $({deg: from}).animate({deg: to}, {
      duration: 200,
      step: function(now) {
        // in the step-callback (that is fired each step of the animation),
        // you can use the `now` paramter which contains the current
        // animation-position (`0` up to `angle`)
        $elem.css({
          transform: 'rotate(' + now + 'deg)'
        });
      }
    });
  }

  setRadio("integrationType", globals.integrationType, function(val) {
    globals.dynamicSolver.reset();
    globals.integrationType = val;
  });


  setRadio("simType", globals.simType, function(val) {
    globals.simType = val;
    globals.simNeedsSync = true;
  });

  setSliderInput("#axialStiffness", globals.axialStiffness, 10, 100, 1, function(val) {
    globals.axialStiffness = val;
    globals.materialHasChanged = true;
  });

  setSliderInput("#faceStiffness", globals.faceStiffness, 0, 5, 0.01, function(val) {
    globals.faceStiffness = val;
    globals.materialHasChanged = true;
  });

  setSliderInput("#creaseStiffness", globals.creaseStiffness, 0, 3, 0.01, function(val) {
    globals.creaseStiffness = val;
    globals.creaseMaterialHasChanged = true;
  });

  setSliderInput("#panelStiffness", globals.panelStiffness, 0, 3, 0.01, function(val) {
    globals.panelStiffness = val;
    globals.creaseMaterialHasChanged = true;
  });

  setSliderInput("#percentDamping", globals.percentDamping, 0.01, 0.5, 0.01, function(val) {
    globals.percentDamping = val;
    globals.materialHasChanged = true;
  });

  var creasePercentSlider = setSliderInput("#creasePercent", globals.creasePercent*100, -100, 100, 1, function(val) {
    globals.creasePercent = val/100;
    globals.shouldChangeCreasePercent = true;
    updateCreasePercent();
  });
  var creasePercentNavSlider = setSlider("#creasePercentNav>div", globals.creasePercent*100, -100, 100, 1, function(val) {
    globals.creasePercent = val/100;
    globals.shouldChangeCreasePercent = true;
    updateCreasePercent();
  });
  var creasePercentBottomSlider = setSlider("#creasePercentBottom>div", globals.creasePercent*100, 0, 100, 1, function(val) {
    globals.creasePercent = val/100;
    globals.shouldChangeCreasePercent = true;
    updateCreasePercent()
  });
  setInput("#currentFoldPercent", globals.creasePercent*100, function(val) {
    globals.creasePercent = val/100;
    globals.shouldChangeCreasePercent = true;
    updateCreasePercent();
  }, -100, 100);

  setLink("#flatIndicator", function() {
    globals.creasePercent = 0;
    globals.shouldChangeCreasePercent = true;
    updateCreasePercent();
  });
  setLink("#foldedIndicator", function() {
    globals.creasePercent = 1;
    globals.shouldChangeCreasePercent = true;
    updateCreasePercent();
  });

  function updateCreasePercent() {

    // remove JQuery UI
    return;

    var val = (globals.creasePercent*100);
    creasePercentSlider.slider('value', val);
    creasePercentNavSlider.slider('value', val);
    creasePercentBottomSlider.slider('value', val);
    $('#currentFoldPercent').val(val.toFixed(0));
    $('#creasePercent>input').val(val.toFixed(0));
    $("#foldPercentSimple").html(val.toFixed(0));
  }
  updateCreasePercent();

  function setDeltaT(val) {
    $("#deltaT").html(val.toFixed(4));
  }

  setLink(".loadFile", function(e) {
    $("#fileSelector").click();
    $(e.target).blur();
  });

  setLink(".demo", function(e) {
    var url = $(e.target).data("url");
    if (url) {
      globals.vertTol = 3;
      globals.importer.importDemoFile(url);
    }
  });

  setLink("#saveSVGScreenshot", function() {
    globals.threeView.saveSVG();
  });

  setLink("#saveSVG", function() {
    globals.pattern.saveSVG();
  });
  setLink("#addAnimationItem", function() {
    globals.videoAnimator.addItem();
  });
  setLink("#addDelay", function() {
    globals.videoAnimator.addDelay();
  });

  setCheckbox("#ambientOcclusion", globals.ambientOcclusion, function(val) {
    globals.ambientOcclusion = val;
  });

  function setColorMode(val) {
    globals.colorMode = val;
    globals.model.setMeshMaterial();
  }
  setRadio("colorMode", globals.colorMode, setColorMode);

  setHexInput("#color1", globals.color1, function(val) {
    globals.color1 = val;
    globals.model.setMeshMaterial();
  });
  setHexInput("#color2", globals.color2, function(val) {
    globals.color2 = val;
    globals.model.setMeshMaterial();
  });

  setCheckbox("#edgesVisible", globals.edgesVisible, function(val) {
    globals.edgesVisible = val;
    if (globals.edgesVisible) $("#edgeVisOptions").show();
    else $("#edgeVisOptions").hide();
    globals.model.updateEdgeVisibility();
  });
  setCheckbox("#mtnsVisible", globals.mtnsVisible, function(val) {
    globals.mtnsVisible = val;
    globals.model.updateEdgeVisibility();
  });
  setCheckbox("#valleysVisible", globals.valleysVisible, function(val) {
    globals.valleysVisible = val;
    globals.model.updateEdgeVisibility();
  });
  setCheckbox("#panelsVisible", globals.panelsVisible, function(val) {
    globals.panelsVisible = val;
    globals.model.updateEdgeVisibility();
  });
  setCheckbox("#passiveEdgesVisible", globals.passiveEdgesVisible, function(val) {
    globals.passiveEdgesVisible = val;
    globals.model.updateEdgeVisibility();
  });
  setCheckbox("#boundaryEdgesVisible", globals.boundaryEdgesVisible, function(val) {
    globals.boundaryEdgesVisible = val;
    globals.model.updateEdgeVisibility();
  });

  setCheckbox("#meshVisible", globals.meshVisible, function(val) {
    globals.meshVisible = val;
    globals.model.updateMeshVisibility();
    if (globals.meshVisible) $("#meshMaterialOptions").show();
    else $("#meshMaterialOptions").hide();
  });

  setCheckbox("#vrEnabled", globals.vrEnabled, function(val) {
    globals.vrEnabled = val;
  });

  setLink("#start", function() {
    $("#pause").css('display', 'inline-block');
    $("#reset").css('display', 'inline-block');
    $("#start").hide();
    $("#stepForwardOptions").hide();
    globals.model.resume();
  });
  setLink("#pause", function() {
    $("#start").css('display', 'inline-block');
    $("#stepForwardOptions").css('display', 'inline-block');
    $("#pause").hide();
    globals.model.pause();
  });
  setLink("#reset", function() {
    if (!globals.simulationRunning) $("#reset").hide();
    globals.model.reset();
  });
  setLink("#resetBottom", function() {
    globals.model.reset();
  });
  setLink("#stepForward", function() {
    globals.model.step(globals.numSteps);
    $("#reset").css('display', 'inline-block');
  });

  setInput("#strainClip", globals.strainClip, function(val) {
    globals.strainClip = val;
  }, 0.0001, 100);

  setCheckbox($("#userInteractionEnabled"), globals.userInteractionEnabled, enableInteraction);
  function enableInteraction(val) {
    globals.userInteractionEnabled = val;
    $("#userInteractionEnabled").prop('checked', val);
    if (val) {
      $("#grabToggle>div").addClass("active");
      $("#orbitToggle>div").removeClass("active");
      globals.rotateModel = null;
      globals.threeView.resetModel();
    } else {
      $("#grabToggle>div").removeClass("active");
      $("#orbitToggle>div").addClass("active");
      globals.UI3D.hideHighlighters();
    }
  }
  setLink("#grabToggle", function() {
    enableInteraction(true);
  });
  setLink("#orbitToggle", function() {
    enableInteraction(false);
  });

  setCheckbox($("#foldUseAngles"), globals.foldUseAngles, function(val) {
    globals.foldUseAngles = val;
  });

  setLink("#shouldCenterGeo", function() {
    globals.shouldCenterGeo = true;
  });

  setInput(".numStepsPerRender", globals.numSteps, function(val) {
    globals.numSteps = val;
  }, 1);


  setLink("#showAdvancedOptions", function() {
    $("#basicUI").hide();
    $("#controlsBottom").animate({
      bottom: "-140px"
    }, function() {
      $("#controls").animate({
      right: 0
      });
      $("#controlsLeft").animate({
        left: 0
      });
    });
  });
  setLink("#hideAdvancedOptions", function() {
    $("#controls").animate({
      right: "-430px"
    }, function() {
      $("#basicUI").fadeIn();
      $("#controlsBottom").animate({
        bottom: 0
      });
    });
    $("#controlsLeft").animate({
      left: "-420px"
    });
  });

  function setButtonGroup(id, callback) {

    // remove JQuery UI
    return;

    $(id+" a").click(function(e) {
      e.preventDefault();
      var $target = $(e.target);
      var val = $target.data("id");
      if (val) {
        $(id+" span.dropdownLabel").html($target.html());
        callback(val);
      }
    });
  }

  function setLink(id, callback) {

    // remove JQuery UI
    return;

    $(id).click(function(e) {
      e.preventDefault();
      callback(e);
    });
  }

  function setRadio(name, val, callback) {

    // remove JQuery UI
    return;

    $("input[name=" + name + "]").on('change', function() {
      var state = $("input[name="+name+"]:checked").val();
      callback(state);
    });
    $(".radio>input[value="+val+"]").prop("checked", true);
  }

  function setInput(id, val, callback, min, max) {

    // remove JQuery UI
    return;

    var $input = $(id);
    $input.change(function() {
      var $this = $(this);
      if ($input.length == 1) $this = $input;//probably not necessary
      var val = $this.val();
      if ($this.hasClass("int")) {
        if (isNaN(parseInt(val))) return;
        val = parseInt(val);
      } else if ($this.hasClass("text")) {
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

  function setHexInput(id, val, callback) {

    // remove JQuery UI
    return;

    var $input = $(id);
    $input.css({"border-color": "#" + val});
    $input.change(function() {
      var val = $input.val();
      var validHex  = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i.test(val);
      if (!validHex) return;
      $input.val(val);
      $input.css({"border-color": "#" + val});
      callback(val);
    });
    $input.val(val);
  }

  function setCheckbox(id, state, callback) {
 
     // remove JQuery UI
    return;

    var $input  = $(id);
    $input.on('change', function () {
      if ($input.is(":checked")) callback(true);
      else callback(false);
    });
    $input.prop('checked', state);
  }

  function setSlider(id, val, min, max, incr, callback, callbackOnStop) {

    // remove JQuery UI
    return;

    var slider = $(id).slider({
      orientation: 'horizontal',
      range: false,
      value: val,
      min: min,
      max: max,
      step: incr
    });
    slider.on("slide", function(e, ui) {
      var val = ui.value;
      callback(val);
    });
    slider.on("slidestop", function() {
      var val = slider.slider('value');
      if (callbackOnStop) callbackOnStop(val);
    });
    return slider;
  }

  function setLogSliderInput(id, val, min, max, incr, callback) {

    // remove JQuery UI
    return;

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
    $input.change(function() {
      var val = $input.val();
      if ($input.hasClass("int")) {
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
    slider.on("slide", function(e, ui) {
      var val = ui.value;
      val = Math.exp(Math.log(min) + scale*(val-min));
      $input.val(val.toFixed(4));
      callback(val, id);
    });
  }

  function setSliderInputVal(id, val) {
    
    // remove JQuery UI
    return;

    $(id+">div").slider({value:val});
    var $input = $(id+">input");
    $input.val(val);
  }

  function setSliderInput(id, val, min, max, incr, callback) {

    // remove JQuery UI
    return;

    var slider = $(id+">div").slider({
      orientation: 'horizontal',
      range: false,
      value: val,
      min: min,
      max: max,
      step: incr
    });

    var $input = $(id+">input");
    $input.change(function() {
      var val = $input.val();
      if ($input.hasClass("int")) {
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
    slider.on("slide", function(e, ui) {
      var val = ui.value;
      $input.val(val);
      callback(val);
    });
    return slider;
  }

  return {
    setDeltaT: setDeltaT,
    updateCreasePercent: updateCreasePercent,
    setSliderInputVal: setSliderInputVal
  }
}

export default initControls;
