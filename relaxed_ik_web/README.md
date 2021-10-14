# relaxed_ik_web
## About
This is the WebAssembly version of [RelaxedIK solver](https://github.com/uwgraphics/relaxed_ik). 

## Installation
(The following steps were tested on Ubuntu 18.04, but it should also work in Windows 10)
1. [Install Rust](https://www.rust-lang.org/tools/install) 
2. `cargo install wasm-pack`
    * if there is a `linker 'cc' not found` error, run `sudo apt install gcc`
	* if it complains about openssl, install it by `sudo apt-get install libssl-dev pkg-config openssl`
3. Clone this repo
4. Pull subrepos by 
```
git submodule init
git submodule update
```
## Usage
1. Compile to WebAssembly
	```
	cd relaxed_ik_web
	wasm-pack build --target web
	```
2. A simple example can be found in `index.html`
	* import RelaxedIK from WebAssembly
		```
		import init, {RelaxedIK} from "./pkg/relaxed_ik_web.js";
		```
	* Initiate a solver. `robot_info` is the robot config file read from .yaml files.
	`robot_nn_config` is the robot self-collision neural network also read from .yaml files.
		```
		let relaxedik = new RelaxedIK(robot_info, robot_nn_config);
		```
	* `goal_pos` is the end-effector position, `goal_rot` is the end-effector orientation in quaternion.
		```
		let res = relaxedik.solve(goal_pos, goal_rot);
		```
## Performance
We compare the time for the solver to compute 1000 randomly generated requests. The tests are repeated 100 times to get average durations and standard deviations. 
The tests were performed on a Win10 machine with i7-7660U @ 2.50GHz CPU and 16 GB RAM.

### Ideal Conditions
Note that the following data are collected in ideal conditions (without background programs or other tabs). Many things can affect webpage performance, *e.g.*, with developer console open in Chrome, the average rate drops from 6.4k Hz to 2.9k Hz.  
| | Rust | WebAssembly (Chrome) | WebAssembly (Firefox) | WebAssembly (Opera) |  WebAssembly (Microsoft Edge) |
| ----- | ------ | ------- |  ------- |  ------- | ------- |
| Avg. Time | 121.83 ms (8.2k Hz) | 155.99 ms (6.4k Hz) |  161.99 ms (6.2k Hz) | 173.72 ms (5.8k Hz) | 185.04 ms (5.4k Hz) |
| Std Dev| 9.85 ms |  11.68 ms | 7.61 ms | 30.36 ms | 56.18 ms |
| Max Time | 156.26 ms (6.4k Hz) | 258.30 ms (3.9k Hz) | 217 ms (4.6k Hz) | 321.60 ms (3.1k Hz)| 366 ms (2.7k Hz)| 
| Min Time | 112.32 ms (8.9k Hz)| 144.20 ms (6.9k Hz)| 151 ms (6.6k Hz) | 154.37 ms (6.5k Hz)| 154.10 ms (6.5k Hz) |

### Stress Tests
The stress tests were performed in Chrome. 
| | Ideal condition | With console open| Run in a background tab | With 10 other tabs playing youtube videos| 
|  ------ | ------- |  ------- |  ------- | ------- | 
| Avg. Time  | 155.99 ms (6.4k Hz) | 340.19 ms (2.9k Hz) | 168.10 ms (5.9k Hz) | 215.10 ms (4.6k Hz)|
| Std Dev| 11.68 ms | 33.82 ms | 14.33 ms | 20.13 ms |
| Max Time |  258.30 ms (3.9k Hz) | 500.5 ms (2.0k Hz) | 235.60 ms (4.2k Hz) | 309 ms (3.2k Hz) | 
| Min Time |  144.20 ms (6.9k Hz) | 294.80 ms (3.4k Hz) | 151.90 ms (6.6k Hz) | 183.30 ms (5.5k Hz) |


## Reference
1. [Mozilla - Compiling from Rust to WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_wasm)
2. [serde_json]( https://rustwasm.github.io/wasm-bindgen/reference/arbitrary-data-with-serde.html)