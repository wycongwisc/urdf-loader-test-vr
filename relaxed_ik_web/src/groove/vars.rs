use nalgebra::{UnitQuaternion, Vector3, Quaternion, Point3};
use crate::spacetime::robot::{Robot, RobotConstructorData};
use crate::groove::collision_nn::{CollisionNN, CollisionNNConstructorData};
use time::PreciseTime;
use std::ops::Deref;
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct VarsConstructorData {
    pub urdf_file_name: String,
    pub fixed_frame: String,
    pub joint_names: Vec<Vec<String>>,
    pub joint_ordering: Vec<String>,
    pub ee_fixed_joints: Vec<String>,
    pub starting_config: Vec<f64>,
    pub collision_file_name: String,
    pub collision_nn_file: String,
    pub path_to_src: String,
    pub axis_types: Vec<Vec<String>>,
    pub velocity_limits: Vec<f64>,
    pub joint_limits: Vec<[f64;2]>,
    pub displacements: Vec< Vec<nalgebra::Vector3<f64>>>,
    pub disp_offsets: Vec<nalgebra::Vector3<f64>>,
    pub rot_offsets: Vec<Vec<Vec<f64>>>,
    pub joint_types: Vec<Vec<String>>,
    pub joint_state_define_func_file: String
}

// #[wasm_bindgen]
pub struct RelaxedIKVars {
    pub robot: Robot,
    pub init_state: Vec<f64>,
    pub xopt: Vec<f64>,
    pub prev_state: Vec<f64>,
    pub prev_state2: Vec<f64>,
    pub prev_state3: Vec<f64>,
    pub goal_positions: Vec<Vector3<f64>>,
    pub goal_quats: Vec<UnitQuaternion<f64>>,
    pub init_ee_positions: Vec<Vector3<f64>>,
    pub init_ee_quats: Vec<UnitQuaternion<f64>>,
    pub position_mode_relative: bool, // if false, will be absolute
    pub rotation_mode_relative: bool, // if false, will be absolute
    pub collision_nn: CollisionNN
}

// #[wasm_bindgen]
impl RelaxedIKVars {
    pub fn new(config: VarsConstructorData, nn_config: CollisionNNConstructorData) -> Self {
        let robotConfig = RobotConstructorData {
            joint_names: config.joint_names,
            joint_ordering: config.joint_ordering,
            collision_file_name: config.collision_file_name,
            collision_nn_file: config.collision_nn_file,
            axis_types: config.axis_types,
            velocity_limits: config.velocity_limits,
            joint_limits: config.joint_limits,
            displacements: config.displacements,
            disp_offsets: config.disp_offsets,
            rot_offsets: config.rot_offsets,
            joint_types: config.joint_types
        };
        let mut robot = Robot::new(robotConfig);
        let num_chains = robot.num_chains;
        let position_mode_relative = true;
        let rotation_mode_relative = true; 
        let starting_config = config.starting_config;

        let mut goal_positions: Vec<Vector3<f64>> = Vec::new();
        let mut goal_quats: Vec<UnitQuaternion<f64>> = Vec::new();

        let init_ee_positions = robot.get_ee_positions(starting_config.as_slice());
        let init_ee_quats = robot.get_ee_quats(starting_config.as_slice());

        for i in 0..num_chains {
            goal_positions.push(init_ee_positions[i]);
            goal_quats.push(init_ee_quats[i]);
        }
        // let collision_nn_file = String::from("sawyer_nn");
        // let collision_nn_path = get_path_to_src()+ "relaxed_ik_core/config/collision_nn_rust/" + collision_nn_file.as_str() + ".yaml";
        let collision_nn = CollisionNN::new(nn_config);

        RelaxedIKVars{robot, init_state: starting_config.clone(), xopt: starting_config.clone(),
            prev_state: starting_config.clone(), prev_state2: starting_config.clone(), prev_state3: starting_config.clone(),
            goal_positions, goal_quats, init_ee_positions, init_ee_quats, position_mode_relative, rotation_mode_relative,
            collision_nn}
    }
    
    // pub fn from_yaml_path(fp: String, position_mode_relative: bool, rotation_mode_relative: bool) -> Self {
    //     let ifp = InfoFileParser::from_yaml_path(fp.clone());
    //     let mut robot = Robot::from_yaml_path(fp.clone());
    //     let num_chains = ifp.joint_names.len();
    //     let sampler = ThreadRobotSampler::new(robot.clone());

    //     let mut goal_positions: Vec<Vector3<f64>> = Vec::new();
    //     let mut goal_quats: Vec<UnitQuaternion<f64>> = Vec::new();

    //     let init_ee_positions = robot.get_ee_positions(ifp.starting_config.as_slice());
    //     let init_ee_quats = robot.get_ee_quats(ifp.starting_config.as_slice());

    //     for i in 0..num_chains {
    //         goal_positions.push(init_ee_positions[i]);
    //         goal_quats.push(init_ee_quats[i]);
    //     }

    //     let collision_nn_path = get_path_to_src()+ "relaxed_ik_core/config/collision_nn_rust/" + ifp.collision_nn_file.as_str() + ".yaml";
    //     let collision_nn = CollisionNN::from_yaml_path(collision_nn_path);

    //     let fp = get_path_to_src() + "relaxed_ik_core/config/settings.yaml";
    //     let fp2 = fp.clone();
    //     let env_collision_file = EnvCollisionFileParser::from_yaml_path(fp);
    //     let frames = robot.get_frames_immutable(&ifp.starting_config.clone());
    //     let env_collision = RelaxedIKEnvCollision::init_collision_world(env_collision_file, &frames);
    //     let objective_mode = get_objective_mode(fp2);

    //     RelaxedIKVars{robot, sampler, init_state: ifp.starting_config.clone(), xopt: ifp.starting_config.clone(),
    //         prev_state: ifp.starting_config.clone(), prev_state2: ifp.starting_config.clone(), prev_state3: ifp.starting_config.clone(),
    //         goal_positions, goal_quats, init_ee_positions, init_ee_quats, position_mode_relative, rotation_mode_relative, collision_nn, 
    //         env_collision, objective_mode}
    // }

    pub fn update(&mut self, xopt: Vec<f64>) {
        self.prev_state3 = self.prev_state2.clone();
        self.prev_state2 = self.prev_state.clone();
        self.prev_state = self.xopt.clone();
        self.xopt = xopt.clone();
    }

}
