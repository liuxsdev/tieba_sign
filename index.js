const crypto = require('crypto');
const axios = require('axios')

async function get_tbs(BDUSS) {
    let url = 'http://tieba.baidu.com/dc/common/tbs'
    let response = await axios.get(url, {
        headers: { 'Cookie': `BDUSS=${BDUSS}` }
    })
    return response['data']['tbs']
}

async function get_fid(name) {
    let url = 'http://tieba.baidu.com/f/commit/share/fnameShareApi?ie=utf-8&fname=' + encodeURI(name)
    let response = await axios.get(url)
    let fid = response['data']['data']['fid']
    //{ no: 0, error: '', data: { fid: 7281402, can_send_pics: 1 } }
    return fid
}

function encode_data(data) {
    const SIGN_KEY = 'tiebaclient!!!'
    let s = `BDUSS=${data['BDUSS']}fid=${data['fid']}kw=${data['kw']}tbs=${data['tbs']}`
    let sign = crypto.createHash('md5').update(s + SIGN_KEY).digest('hex')
    data['sign'] = sign.toLocaleUpperCase()
    return data
}

async function sign(BDUSS, kw) {
    let url = 'http://c.tieba.baidu.com/c/c/forum/sign'
    let headers = { 'Cookie': `BDUSS=${BDUSS}` }
    let tbs = await get_tbs(BDUSS)
    let fid = await get_fid(kw)
    let data = {
        BDUSS, kw, fid, tbs
    }
    data = encode_data(data)
    let _data = `BDUSS=${data['BDUSS']}&fid=${data['fid']}&kw=${data['kw']}&tbs=${data['tbs']}&sign=${data['sign']}`
    _data = encodeURI(_data)
    let response = await axios.post(url, _data, { headers })
    return response['data']

}

exports.tieba_sign = sign;
