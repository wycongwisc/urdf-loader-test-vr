import * as T from 'three';
import URDFLoader from 'urdf-loader';
import { initScene } from './sceneInit';
import * as yaml from 'js-yaml';
import { getURDFFromURL } from './utilities/loaderHelper';
import initRelaxedIK, { RelaxedIK } from "../relaxed_ik_web/pkg/relaxed_ik_web.js";
import { getCurrEEPose } from './utils';

import ThreeMeshUI from 'three-mesh-ui'

import { VrControl } from './vrControl.js'
import { Data } from './Data';
import { UI } from './UI';
// relaxedikDemo();

/**
 * Adds the robot to the scene, sets initial joint values, and initializes RelaxedIK
 * 
 * @param {String} file 
 * @param {String} info 
 * @param {String} nn 
 * @param {Boolean} loadScreen 
 */
function loadRobot(name, file, info, nn, loadScreen = false) {
    const loader = new URDFLoader(loadScreen ? new T.LoadingManager(() => {
        const loadingScreen = document.querySelector('#loading-screen');
        loadingScreen.classList.add('fade-out');
        loadingScreen.addEventListener('transitionend', (e) => e.target.remove());
    }) : null);

    loader.load(file, robot => {
        robot.rotation.x = -Math.PI / 2;
        robot.position.y = 0.02;
        robot.position.x = .25;
        robot.traverse(child => {
            child.castShadow = true;
            if (child.material) child.material.alphaToCoverage = true;
        });
        scene.add(robot);
        window.robot = robot;
        window.robotName = name;

        initRelaxedIK().then(async () => {
            window.robotInfo = yaml.load(await fetch(info).then(response => response.text()));
            window.robotNN = yaml.load(await fetch(nn).then(response => response.text()));

            const joints = Object.entries(window.robot.joints).filter(joint => joint[1]._jointType != "fixed" && joint[1].type != "URDFMimicJoint");
            joints.forEach(joint => {
                const jointIndex = window.robotInfo.joint_ordering.indexOf(joint[0]);
                if (jointIndex != -1) window.robot.setJointValue(joint[0], window.robotInfo.starting_config[jointIndex]);
            })    

            window.relaxedIK = new RelaxedIK(window.robotInfo, window.robotNN);
            console.log('%cSuccessfully loaded robot config.', 'color: green');

            init();
        });
    });
}

///////////////////////////////////////////////////////////

const [scene, camera, renderer, camControls] = initScene();
window.scene = scene;

// load robots

const robots = {
    sawyer: {
        info: 'https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/info_files/sawyer_info.yaml',
        nn: 'https://raw.githubusercontent.com/uwgraphics/relaxed_ik_core/collision-ik/config/collision_nn_rust/sawyer_nn.yaml'
    },
    ur5: {}
}

getURDFFromURL("https://raw.githubusercontent.com/wycongwisc/robot-files/master/sawyer_description/urdf/sawyer_gripper.urdf", (blob) => {
    robots.sawyer.file = URL.createObjectURL(blob);
    loadRobot('sawyer', robots.sawyer.file, robots.sawyer.info, robots.sawyer.nn, true);
})

getURDFFromURL("https://raw.githubusercontent.com/yepw/robot_configs/master/ur5_description/urdf/ur5_gripper.urdf", (blob) => {
    robots.ur5.file = URL.createObjectURL(blob);
})

function init() {
    const data = new Data();

    const ui = new UI();

    const vrControl = new VrControl({
        camera,
        renderer,
        data,
        ui,
    })

    // update loop

    setTimeout(function update() { 
        if (renderer.xr.isPresenting) {
            // initialize timestamp here to ensure tables can be joined by timestamp
            const t = Date.now();
            vrControl.update(t);

            // log updated data
            vrControl.log(t);
        }
        setTimeout(update, 5);
    }, 5);

    // render loop

    renderer.setAnimationLoop( function () {
        ThreeMeshUI.update();
        vrControl.teleportvr?.update();
        renderer.render(scene, camera);
    });
}

