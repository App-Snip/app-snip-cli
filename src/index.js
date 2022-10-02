const inquirer = require("inquirer");
const axios = require("axios");

const fs = require("fs");
var FormData = require("form-data");

const config = {
  path: "/api/v3",
};
let signinEndpoint;
let signupEndpoint;
let apiEndpointBase;

const q = (type, name, message) => {
  return { type, name, message };
};

const signupPrompt = async () => {
  const signupQuestions = [
    q("input", "username", "choose username:"),
    q("password", "password", "password:"),
    q("password", "passwordConfirm", "password confirm:"),
    {
      type: "list",
      name: "role",
      message: "Are you a teacher or a student?",
      choices: ["student", "teacher"],
    },
  ];
  const userCredentials = await inquirer.prompt(signupQuestions);
  const { username, password, role } = userCredentials;
  if (password === userCredentials.passwordConfirm) {
    try {
      const resp = await axios({
        url: signupEndpoint,
        method: "POST",
        data: { password, username, role },
      });
      return resp.data.token;
    } catch (e) {
      console.log(e.message);
      return "Password Error";
    }
  } else return "Password Error";
};

const signinPrompt = async () => {
  const signinQuestions = [
    q("input", "username", "username:"),
    q("password", "password", "password:"),
  ];
  const userCredentials = await inquirer.prompt(signinQuestions);
  try {
    const resp = await axios({
      url: signinEndpoint,
      method: "POST",
      auth: userCredentials,
    });
    return resp.data.token;
  } catch (e) {
    throw "Error signing in.";
  }
};

const promptChooseSigninOrSignup = async () => {
  const question = {
    type: "list",
    name: "signinOrSignup",
    message: "Would you like to signin or signup?",
    choices: ["signin", "signup"],
  };
  const signinOrSignup = await inquirer.prompt(question);
  return signinOrSignup;
};

const signinSignupPrompts = async () => {
  const resp = await promptChooseSigninOrSignup();
  if (resp.signinOrSignup === "signin") {
    const token = await signinPrompt();
    return token;
  } else if (resp.signinOrSignup === "signup") {
    const token = await signupPrompt();
    return token;
  }
};

const scanDir = (dir) => {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, files) => {
      if (err) {
        return reject(err);
      }
      return resolve(files);
    });
  });
};

const fileIsImage = (filename) => {
  const imgRegEx = /\.(png|jpe?g|gif)$/i;
  return imgRegEx.test(filename);
};

const scanForImages = async (dir) => {
  const files = await scanDir(dir);
  return files.filter((f) => fileIsImage(f));
};

const promptForUpload = async (imageFiles) => {
  const prompts = [
    {
      type: "list",
      name: "okToUpload",
      message: "Do you want to submit the above files?",
      choices: ["yes", "no"],
    },
    q("input", "assignment", "What is the name of the assignment?"),
  ];
  console.log(`Found {imageFiles} image files`);
  imageFiles.forEach((file) => {
    console.log(file);
  });
  const response = await inquirer.prompt(prompts);
  if (response.okToUpload === "yes") {
    return response.assignment;
  } else {
    return false;
  }
};

const doUpload = async (file, assignment, token) => {
  const url = apiEndpointBase + "/images";
  const form = new FormData();
  console.log("uploading...", file);
  form.append("title", "Screenshot 99");
  form.append("screenshot_img", fs.createReadStream(file));
  form.append("description", assignment);
  try {
    const resp = await axios({
      url: url,
      method: "POST",
      data: form,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("finished upload: ", file);
    return resp.data;
  } catch (e) {
    throw `Error uploading file ${file} ${e.message}`;
  }
};

const doBulkUpload = (files, assignment, token) => {
  const promises = files.map((file) => doUpload(file, assignment, token));
  return Promise.all(promises);
};

const start = async (server, screenshotDir) => {
  console.log(screenshotDir);
  signinEndpoint = `${server}/signin`;
  signupEndpoint = `${server}/signup`;
  apiEndpointBase = `${server}${config.path}`;
  let token;
  try {
    token = await signinSignupPrompts();
  } catch (e) {
    console.log(e);
    return;
  }
  if (token) {
    console.log("Welcome");
    const imgDir = screenshotDir;
    let okToUpload = false;
    let imgPaths = [];
    let assignment;
    try {
      const imgFiles = await scanForImages(imgDir);
      imgPaths = imgFiles.map((img) => `${imgDir}/${img}`);
      okToUpload = await promptForUpload(imgPaths);
      assignment = okToUpload; // name of assignment was returned from promptForUpload
    } catch (e) {
      console.log(e.message);
    }
    if (okToUpload) {
      console.log("uploading files...");
      const uploads = await doBulkUpload(imgPaths, assignment, token);
      uploads.forEach((u) => {
        console.log(
          `Uploaded screenshot: ${u.title} [${u.description}]\n  ${u.imgUrl}`
        );
      });
    } else {
      console.log("No.");
    }
  }
};

const cli = { start };

module.exports = cli;
