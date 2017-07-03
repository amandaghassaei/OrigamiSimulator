/**
 * Created by ghassaei on 2/22/17.
 */

globals = {};

function setCookie(c_name,value,exdays){var exdate=new Date();exdate.setDate(exdate.getDate() + exdays);var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());document.cookie=c_name + "=" + c_value;}
function getCookie(c_name){var c_value = document.cookie;var c_start = c_value.indexOf(" " + c_name + "=");if (c_start == -1){c_start = c_value.indexOf(c_name + "=");}if (c_start == -1){c_value = null;}else{c_start = c_value.indexOf("=", c_start) + 1;var c_end = c_value.indexOf(";", c_start);if (c_end == -1){c_end = c_value.length;}c_value = unescape(c_value.substring(c_start,c_end));}return c_value;}
function delCookie(name){document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';}

$(function() {

    // if (!getCookie('firsttime')){
    //     //Runs the code because the cookie doesn't exist and it's the user's first time
    //     console.log("first time");
    //     //Set's the cookie to true so there is a value and the code shouldn't run again.
    //     setCookie('firsttime',true);
    // }

    globals = initGlobals();
    globals.UI3D = init3DUI(globals);
    globals.importer = initImporter(globals);
    globals.model = initModel(globals);
    globals.staticSolver = initStaticSolver(globals);
    globals.dynamicSolver = initDynamicSolver(globals);
    globals.rigidSolver = initRigidSolver(globals);
    globals.pattern = initPattern(globals);
    globals.vive = initViveInterface(globals);
    globals.videoAnimator = initVideoAnimator(globals);
    $(".demo[data-url='Tessellations/huffmanWaterbomb.svg']").click();//load demo models
});