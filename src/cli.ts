import { get_favs, sign, get_tbs, get_fid } from "./index";
import { readFile, access, writeFile } from "fs/promises";

import password from "@inquirer/password";

const file_path = "./tieba.json";

// 从环境变量获取BDUSS或者直接输入BDUSS
async function get_bduss() {
  let BDUSS = "";
  if (!process.env.BDUSS) {
    BDUSS = await password({
      message: "Enter Your BDUSS: ",
      mask: "*",
      validate: (input) => {
        if (input.trim() === "") {
          return "输入的BDUSS值不能为空，请重新输入。";
        }
        return true;
      },
    });
  } else {
    BDUSS = process.env.BDUSS;
  }
  return BDUSS;
}

async function read_json_file(file_path: string) {
  try {
    // 使用fs.promises.readFile()读取JSON文件并使用await等待异步结果
    const data = await readFile(file_path, "utf8");
    // 将读取的JSON字符串转换为JavaScript对象
    const json_data = JSON.parse(data);
    return json_data;
  } catch (error) {
    console.error("读取文件出错：", error);
  }
}

async function get_favs_and_fid(BDUSS: string) {
  try {
    await access(file_path);
    console.log("本地读取贴吧信息");
    let json_data = await read_json_file(file_path);
    return json_data;
  } catch (error) {
    console.log("文件不存在,正在收集关注的贴吧信息...");
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
      await writeFile(file_path, jsonString);
      console.log("已保存到本地");
    } catch (err) {
      console.error("Error writing to file:", err);
    }
    return favs_with_fid;
  }
}

async function sign_kw(bduss: string, tbs: string, kw: string, fid: number) {
  let msg = "";
  let isOK = false;
  try {
    const res = await sign(bduss, tbs, kw, fid);
    if (res.error_code === "0") {
      msg = "👌 签到成功";
      isOK = true;
    } else if (res.error_code === "160002") {
      msg = "👌 已经签过";
      isOK = true;
    } else {
      msg = "❌ 签到失败";
    }
  } catch (err) {
    msg = `❌ 签到失败 ${err}`;
  }
  console.log(`签到 ${kw} 吧\t\t ${msg}`);
  return isOK;
}

async function main() {
  // 先从环境变量中读取BDUSS或者输入BDUSS
  const BDUSS = await get_bduss();

  // const t = new Tieba(BDUSS);

  // 获取关注的贴吧列表
  const favs = await get_favs_and_fid(BDUSS);
  console.log(`共需签到${favs.length}个贴吧`);

  // 开始签到

  // 获取tbs
  console.time("签到用时");
  const tbs = await get_tbs(BDUSS);

  const tasks = favs.map((item) => sign_kw(BDUSS, tbs, item.kw, item.fid));
  const res = await Promise.all(tasks);
  const trueCount = res.reduce((count, currentValue) => {
    return count + (currentValue === true ? 1 : 0);
  }, 0);
  console.log(`签到成功 ${trueCount}`);
  console.timeEnd("签到用时");
}

main();
