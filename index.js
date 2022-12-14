const yargs = require("yargs");
const cli = require("./src");

yargs.version("0.1.0");
// Create add command
yargs
  .command({
    command: "upload",
    describe: "Uploads screenshots to the cloud",
    builder: {
      dir: {
        describe: "Screenshot directory",
        alias: "d",
        demandOption: true, // Required
        type: "string",
      },
      server: {
        describe: "Server address e.g. https://...",
        alias: "s",
        demandOption: true, // Required
        type: "string",
      },
    },

    // Function for your command
    handler(argv) {
      cli.start(argv.server, argv.dir);
    },
  })
  .demandCommand();

yargs.parse();
