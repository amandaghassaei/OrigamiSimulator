import { string } from "rollup-plugin-string";
import cleanup from "rollup-plugin-cleanup";

module.exports = {
  input: "js/main.js",
  output: {
    name: "OrigamiSimulator",
    file: "origami-simulator.js",
    format: "umd",
    // format: "es6",
    banner: "/* Origami Simulator (c) Amanda Ghassaei, MIT License */"
  },
  plugins: [
    cleanup({
      comments: "none",
      maxEmptyLines: 0,
    }),
    string({
      include: ["**/*.frag", "**/*.vert"], // import shaders like .js files
    }),
  ],
};
