import { createHash } from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";

interface SignPostData {
  BDUSS: string;
  kw: string;
  fid: number;
  tbs: string;
}

interface FavInfo {
  id: string;
  kw: string;
  level: string;
  exp: string;
}

type FavInfoArray = FavInfo[];

async function get_tbs(BDUSS: string) {
  const url = "http://tieba.baidu.com/dc/common/tbs";
  const response = await axios.get(url, {
    headers: { Cookie: `BDUSS=${BDUSS}` },
  });
  return response["data"]["tbs"];
}

async function is_login(BDUSS: string) {
  const url = "http://tieba.baidu.com/dc/common/tbs";
  const response = await axios.get(url, {
    headers: { Cookie: `BDUSS=${BDUSS}` },
  });
  if (response["data"]["is_login"] == 1) {
    return true;
  }
  return false;
}

async function get_fid(name: string) {
  let url = "http://tieba.baidu.com/f/commit/share/fnameShareApi?ie=utf-8&fname=" + encodeURI(name);
  let response = await axios.get(url);
  let fid = response["data"]["data"]["fid"];
  //{ no: 0, error: '', data: { fid: 7281402, can_send_pics: 1 } }
  return fid;
}

function encode_data(data: SignPostData) {
  const SIGN_KEY = "tiebaclient!!!";
  let s = `BDUSS=${data["BDUSS"]}fid=${data["fid"]}kw=${data["kw"]}tbs=${data["tbs"]}`;
  let sign = createHash("md5")
    .update(s + SIGN_KEY)
    .digest("hex");
  data["sign"] = sign.toLocaleUpperCase();
  return data;
}

async function sign(BDUSS: string, kw: string, fid: number) {
  const url = "http://c.tieba.baidu.com/c/c/forum/sign";
  const headers = { Cookie: `BDUSS=${BDUSS}` };
  const tbs = await get_tbs(BDUSS);
  let data = { BDUSS, kw, fid, tbs };
  data = encode_data(data);
  let _data = `BDUSS=${data["BDUSS"]}&fid=${data["fid"]}&kw=${encodeURIComponent(data["kw"])}&tbs=${data["tbs"]}&sign=${
    data["sign"]
  }`;
  // c++签到失败
  let response = await axios.post(url, _data, { headers });
  return response["data"];
}

async function get_favs(BDUSS: string): Promise<FavInfoArray> {
  // 获取关注的贴吧
  const url =
    "http://tieba.baidu.com/mo/q---B8D06B9EB00241F919F47789D4FD3103%3AFG%3D1--1-1-0--2--wapp_1385540291997_626/m?tn=bdFBW&tab=favorite";
  let headers = { Cookie: `BDUSS=${BDUSS}` };
  let res = await axios.get(url, { headers });
  let html = res["data"];
  const $ = cheerio.load(html);
  let tr = $("table tr");
  let result = [];
  tr.each(function (i, el) {
    let id = $(el).children("td:nth-child(1)").text().split(".")[0];
    let kw = $(el).children("td:nth-child(1)").text().split(".")[1];
    let level = $(el).children("td:nth-child(2)").text().split("等级")[1];
    let exp = $(el).children("td:nth-child(3)").text().split("经验值")[1];
    result[i] = { id, kw, level, exp };
  });
  return result;
}

export { sign, get_favs, get_tbs, get_fid, is_login };
