// Transpiles TypeScript for jest; type checking is `yarn typecheck` (tsc)
module.exports = {
    presets: [
        ["@babel/preset-env", {targets: {node: "current"}}],
        "@babel/preset-typescript",
    ],
};
