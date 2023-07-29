import { get_favs, sign, get_fid, is_login } from "./index";
import { readFile, access, writeFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { join, dirname } from "path";

import password from "@inquirer/password";

const file_name = "tieba.json";
const config_file_path = join(homedir(), ".config", "tieba_sign", file_name);
const config_folder = dirname(config_file_path);

// 从环境变量获取BDUSS或者直接输入BDUSS
async function get_bduss() {
  let BDUSS = "";
  if (!process.env.BDUSS) {
    BDUSS = await password({
      message: "Enter Your BDUSS: ",
      mask: "*",
      validate: async (input) => {
        if (input.trim() === "") {
          return "输入的BDUSS值不能为空，请重新输入。";
        } else {
          const logined = await is_login(input.trim());
          if (!logined) {
            return "BDUSS值无效,请检查";
          }
        }
        return true;
      },
    });
  } else {
    BDUSS = process.env.BDUSS;
    // 判断BDUSS是否有效
    const logined = await is_login(BDUSS);
    if (!logined) {
      console.log("环境变量中的BDUSS无效");
      process.exit();
    }
  }
  return BDUSS;
}

async function read_json_file(config_file_path: string) {
  try {
    // 使用fs.promises.readFile()读取JSON文件并使用await等待异步结果
    const data = await readFile(config_file_path, "utf8");
    // 将读取的JSON字符串转换为JavaScript对象
    const json_data = JSON.parse(data);
    return json_data;
  } catch (error) {
    console.error("读取文件出错：", error);
  }
}

async function get_favs_and_fid(BDUSS: string) {
  try {
    await access(config_file_path);
    console.log("本地读取贴吧信息");
    let json_data = await read_json_file(config_file_path);
    return json_data;
  } catch (error) {
    console.log("config不存在,正在收集关注的贴吧信息...");
    // 创建config文件夹
    await mkdir(config_folder, { recursive: true });
    console.time("获取关注的贴吧及fid用时");
    const favs = await get_favs(BDUSS);
    const favs_with_fid = await Promise.all(
      favs.map(async (fav) => {
        const kw = fav.kw;
        const fid = await get_fid(kw);
        return { kw, fid };
      })
    );
    console.log(`获取成功, 共 ${favs_with_fid.length} 个贴吧`);
    console.timeEnd("获取关注的贴吧及fid用时");
    const jsonString = JSON.stringify(favs_with_fid, null, 2);
    try {
      await writeFile(config_file_path, jsonString);
      console.log("已保存到本地");
    } catch (err) {
      console.error("Error writing to file:", err);
    }
    return favs_with_fid;
  }
}

async function sign_kw(bduss: string, kw: string, fid: number) {
  let msg = "";
  let isOK = false;
  try {
    const res = await sign(bduss, kw, fid);
    if (res.error_code == "0") {
      msg = "👌 签到成功";
      isOK = true;
    } else if (res.error_code == "160002") {
      msg = "👌 已经签过";
      isOK = true;
    } else {
      // 110001:未知错误
      msg = `❌ 签到失败[${res.error_msg}]`;
    }
  } catch (err) {
    msg = `❌ 签到失败 ${err}`;
  }
  console.log(`${msg}: ${kw}`);
  return isOK;
}

async function main() {
  // 先从环境变量中读取BDUSS或者输入BDUSS
  const BDUSS = await get_bduss();

  // 获取关注的贴吧列表
  const favs = await get_favs_and_fid(BDUSS);
  console.log(`共需签到${favs.length}个贴吧`);

  // 开始签到
  console.time("签到用时");
  const tasks = favs.map((item: { kw: string; fid: number }) => sign_kw(BDUSS, item.kw, item.fid));
  const res = await Promise.all(tasks);
  const trueCount = res.reduce((count, currentValue) => {
    return count + (currentValue === true ? 1 : 0);
  }, 0);
  console.log(`签到成功: ${trueCount}/${favs.length} 失败: ${favs.length - trueCount}`);
  console.timeEnd("签到用时");
}

main();
