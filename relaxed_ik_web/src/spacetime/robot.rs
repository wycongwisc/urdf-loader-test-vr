use crate::spacetime::arm::{Arm, ArmConstructorData};
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
pub struct RobotConstructorData {
    pub joint_names: Vec<Vec<String>>,
    pub joint_ordering: Vec<String>,
    pub collision_file_name: String,
    pub collision_nn_file: String,
    pub axis_types: Vec<Vec<String>>,
    pub velocity_limits: Vec<f64>,
    pub joint_limits: Vec<[f64;2]>,
    pub displacements: Vec< Vec<nalgebra::Vector3<f64>>,>,
    pub disp_offsets: Vec<nalgebra::Vector3<f64>>,
    pub rot_offsets: Vec<Vec<Vec<f64>>>,
    pub joint_types: Vec<Vec<String>>
}

#[derive(Clone, Debug)]
#[derive(Serialize, Deserialize)]
pub struct RobotConstructData {
    axis_types: Vec<String>,
    displacements: Vec<nalgebra::Vector3<f64>>, 
    disp_offset: nalgebra::Vector3<f64>,
    rot_offsets: Vec<Vec<f64>>, 
    joint_types: Vec<String>
}

#[derive(Clone, Debug)]
pub struct Robot {
    pub arms: Vec<Arm>,
    pub joint_names: Vec<Vec<String>>,
    pub joint_ordering: Vec<String>,
    pub num_chains: usize,
    pub num_dof: usize,
    pub subchain_indices: Vec<Vec<usize>>,
    pub bounds: Vec< [f64; 2] >,
    pub lower_bounds: Vec<f64>,
    pub upper_bounds: Vec<f64>,
    velocity_limits: Vec<f64>,
    __subchain_outputs: Vec<Vec<f64>>
}

impl Robot {
    pub fn new(config: RobotConstructorData) -> Robot {

        let armConfig = ArmConstructorData {
            axis_types: config.axis_types[0].clone(),
            displacements: config.displacements[0].clone(),
            disp_offset: config.disp_offsets[0].clone(),
            rot_offsets: config.rot_offsets[0].clone(),
            joint_types: config.joint_types[0].clone()
        };
        let arm = Arm::new(armConfig);
        let arms = vec![arm];
        let joint_names = config.joint_names;
        let joint_ordering = config.joint_ordering;
        let num_chains = 1;
        let num_dof = 7;
        let subchain_indices = Robot::get_subchain_indices(&joint_names, &joint_ordering);
        let mut __subchain_outputs: Vec<Vec<f64>> = Vec::new();
        for i in 0..subchain_indices.len() {
            let v: Vec<f64> = Vec::new();
            __subchain_outputs.push(v);
            for j in 0..subchain_indices[i].len() {
                __subchain_outputs[i].push(0.0);
            }
        }
    
        let joint_limits =  config.joint_limits;
        let mut upper_bounds: Vec<f64> = Vec::new();
        let mut lower_bounds: Vec<f64> = Vec::new();
        for i in 0..joint_limits.len() {
            upper_bounds.push(joint_limits[i][1].clone());
            lower_bounds.push(joint_limits[i][0].clone());
        }

        let velocity_limits = config.velocity_limits;
        Robot{arms, joint_names: joint_names.clone(), 
            joint_ordering: joint_ordering.clone(), 
            num_chains, num_dof, subchain_indices, bounds: joint_limits.clone(),
            lower_bounds, upper_bounds, velocity_limits: velocity_limits.clone(),
            __subchain_outputs}
    }

    // pub fn from_info_file_parser(ifp: &yaml_utils::InfoFileParser) -> Robot {
    //     let num_chains = ifp.axis_types.len();
    //     let num_dof = ifp.velocity_limits.len();

    //     let mut arms: Vec<arm::Arm> = Vec::new();
    //     for i in 0..num_chains {
    //         let a = arm::Arm::new(ifp.axis_types[i].clone(), ifp.displacements[i].clone(),
    //                           ifp.disp_offsets[i].clone(), ifp.rot_offsets[i].clone(), ifp.joint_types[i].clone());
    //         arms.push(a);
    //     }

    //     let subchain_indices = Robot::get_subchain_indices(&ifp.joint_names, &ifp.joint_ordering);

    //     let mut __subchain_outputs: Vec<Vec<f64>> = Vec::new();
    //     for i in 0..subchain_indices.len() {
    //         let v: Vec<f64> = Vec::new();
    //         __subchain_outputs.push(v);
    //         for j in 0..subchain_indices[i].len() {
    //             __subchain_outputs[i].push(0.0);
    //         }
    //     }

    //     let mut upper_bounds: Vec<f64> = Vec::new();
    //     let mut lower_bounds: Vec<f64> = Vec::new();
    //     for i in 0..ifp.joint_limits.len() {
    //         upper_bounds.push(ifp.joint_limits[i][1].clone());
    //         lower_bounds.push(ifp.joint_limits[i][0].clone());
    //     }

    //     Robot{arms, joint_names: ifp.joint_names.clone(), joint_ordering: ifp.joint_ordering.clone(),
    //         num_chains, num_dof, subchain_indices, bounds: ifp.joint_limits.clone(), lower_bounds, upper_bounds, velocity_limits: ifp.velocity_limits.clone(), __subchain_outputs}
    // }

    // pub fn from_yaml_path(fp: String) -> Robot {
    //     let ifp = yaml_utils::InfoFileParser::from_yaml_path(fp);
    //     Robot::from_info_file_parser(&ifp)
    // }
}
impl Robot {
    pub fn split_into_subchains(&self, x: &[f64]) -> Vec<Vec<f64>>{
        let mut out_subchains: Vec<Vec<f64>> = Vec::new();
        for i in 0..self.num_chains {
            let s: Vec<f64> = Vec::new();
            out_subchains.push(s);
            for j in 0..self.subchain_indices[i].len() {
                out_subchains[i].push( x[self.subchain_indices[i][j]] );
            }
        }
        out_subchains
    }

    pub fn split_into_subchains_inplace(&mut self, x: &[f64]) {
        // let mut out_subchains: Vec<Vec<f64>> = Vec::new();
        for i in 0..self.num_chains {
            let s: Vec<f64> = Vec::new();
            // out_subchains.push(s);
            for j in 0..self.subchain_indices[i].len() {
                self.__subchain_outputs[i][j] = x[self.subchain_indices[i][j]];
            }
        }
    }

    pub fn get_frames(&mut self, x: &[f64]) {
        self.split_into_subchains_inplace(x);
        for i in 0..self.num_chains {
            self.arms[i].get_frames(self.__subchain_outputs[i].as_slice());
        }
    }

    pub fn get_frames_immutable(&self, x: &[f64]) -> Vec<(Vec<nalgebra::Vector3<f64>>, Vec<nalgebra::UnitQuaternion<f64>>)> {
        let mut out: Vec<(Vec<nalgebra::Vector3<f64>>, Vec<nalgebra::UnitQuaternion<f64>>)> = Vec::new();
        let subchains = self.split_into_subchains(x);
        for i in 0..self.num_chains {
            out.push( self.arms[i].get_frames_immutable( subchains[i].as_slice() ) );
        }
        out
    }

    pub fn get_ee_pos_and_quat_immutable(&self, x: &[f64]) -> Vec<(nalgebra::Vector3<f64>, nalgebra::UnitQuaternion<f64>)> {
        let mut out: Vec<(nalgebra::Vector3<f64>, nalgebra::UnitQuaternion<f64>)> = Vec::new();
        let subchains = self.split_into_subchains(x);
        for i in 0..self.num_chains {
            out.push( self.arms[i].get_ee_pos_and_quat_immutable( subchains[i].as_slice() ) );
        }
        out
    }

    pub fn get_ee_positions(&mut self, x: &[f64]) -> Vec<nalgebra::Vector3<f64>> {
        let mut out: Vec<nalgebra::Vector3<f64>> = Vec::new();
        self.split_into_subchains_inplace(x);
        for i in 0..self.num_chains {
            out.push(self.arms[i].get_ee_position(self.__subchain_outputs[i].as_slice()));
        }
        out
    }

    pub fn get_ee_rot_mats(&mut self, x: &[f64]) -> Vec<nalgebra::Matrix3<f64>> {
        let mut out: Vec<nalgebra::Matrix3<f64>> = Vec::new();
        self.split_into_subchains_inplace(x);
        for i in 0..self.num_chains {
            out.push(self.arms[i].get_ee_rot_mat(self.__subchain_outputs[i].as_slice()));
        }
        out
    }

    pub fn get_ee_quats(&mut self, x: &[f64]) -> Vec<nalgebra::UnitQuaternion<f64>> {
        let mut out: Vec<nalgebra::UnitQuaternion<f64>> = Vec::new();
        self.split_into_subchains_inplace(x);
        for i in 0..self.num_chains {
            out.push(self.arms[i].get_ee_quat(self.__subchain_outputs[i].as_slice()));
        }
        out
    }

    fn get_subchain_indices(joint_names: &Vec<Vec<String>>, joint_ordering: &Vec<String>) -> Vec<Vec<usize>> {
        let mut out: Vec<Vec<usize>> = Vec::new();

        let num_chains = joint_names.len();
        for i in 0..num_chains {
            let v: Vec<usize> = Vec::new();
            out.push(v);
        }

        for i in 0..num_chains {
            for j in 0..joint_names[i].len() {
                let idx = Robot::get_index_from_joint_order(joint_ordering, &joint_names[i][j]);
                if  idx == 10101010 {
                } else {
                    out[i].push(idx);
                }
            }
        }
        out
    }

    pub fn get_index_from_joint_order(joint_ordering: &Vec<String>, joint_name: &String) -> usize {
        for i in 0..joint_ordering.len() {
            if *joint_name == joint_ordering[i] {
                return i
            }
        }
        10101010
    }

}

