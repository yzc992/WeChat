'use strict';
const qr = require('qr-image');
module.exports = {
  // api返回成功
  apiSuccess(data = '', msg = 'ok', code = 200) {
    this.status = code;
    this.body = {
      msg,
      data,
    };
  },
  // api返回失败
  apiFail(data = '', msg = 'fail', code = 400) {
    this.body = {
      msg,
      data,
    };
    this.status = code;
  },
  // 生成token
  getToken(value) {
    return this.app.jwt.sign(value, this.app.config.jwt.secret);
  },
  // 验证token
  checkToken(token) {
    return this.app.jwt.verify(token, this.app.config.jwt.secret);
  },
  // 发送或者存到消息队列中
  async sendAndSaveMessage(to_id, message, msg = 'ok') {
    const {
      app,
      service,
    } = this;
    const current_user_id = this.authUser.id;

    // 拿到接受用户所在子进程
    const pid = await service.cache.get('online_' + to_id);

    if (pid) {
      // 消息推送
      app.messenger.sendTo(pid, 'send', {
        to_id,
        message,
        msg,
      });
      // 存到历史记录当中
      if (msg === 'ok') {
        service.cache.setList(`chatlog_${to_id}_${message.chat_type}_${current_user_id}`, message);
      }
    } else {
      service.cache.setList('getmessage_' + to_id, {
        message,
        msg,
      });
    }
  },
  // 发送消息
  async send(to_id, message, msg = 'ok') {
    const {
      app,
      service,
    } = this;
    const current_user_id = this.authUser.id;
    console.log(current_user_id);

    // 拿到接受用户所在子进程
    const pid = await service.cache.get('online_' + to_id);

    if (pid) {
      // 消息推送
      app.messenger.sendTo(pid, 'send', {
        to_id,
        message,
        msg,
      });
    }
  },
  // 生成二维码
  qrcode(data) {
    const image = qr.image(data, {
      size: 10,
    });
    this.response.type = 'image/png';
    this.body = image;
  },
  // 生成唯一id
  genID(length) {
    return Number(Math.random().toString().substr(3, length) + Date.now()).toString(36);
  },
  // 用户上线
  async online(user_id) {
    const {
      service,
      app,
    } = this;
    const pid = process.pid;
    // 下线其他设备
    const opid = await service.cache.get('online_' + user_id);
    if (opid) {
      // 通知对应进程用户下线
      app.messenger.sendTo(opid, 'offline', user_id);
    }
    // 存储上线状态
    service.cache.set('online_' + user_id, pid);
  },
};
