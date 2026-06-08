const tencentcloud = require('tencentcloud-sdk-nodejs-sms')
const SmsClient = tencentcloud.sms.v20210111.Client

async function sendSms(phone, templateParam) {
  const secretId = process.env.TENCENT_SECRET_ID
  const secretKey = process.env.TENCENT_SECRET_KEY
  const sdkAppId = process.env.SMS_SDK_APP_ID
  const signName = process.env.SMS_SIGN_NAME
  const templateId = process.env.SMS_TEMPLATE_ID

  if (!secretId || !secretKey || !sdkAppId || !signName || !templateId) {
    console.warn('[SMS] 未配置腾讯云短信凭证，跳过实际发送')
    return { SendStatusSet: [{ Code: 'Ok' }] }
  }

  const client = new SmsClient({
    credential: { secretId, secretKey },
    region: 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com', reqTimeout: 10 } }
  })

  // 自动加国家码
  const phoneNumber = phone.startsWith('+86') ? phone : '+86' + phone
  const params = {
    SmsSdkAppId: sdkAppId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [templateParam.code],
    PhoneNumberSet: [phoneNumber]
  }

  const result = await client.SendSms(params)
  const status = result.SendStatusSet?.[0]
  if (status?.Code !== 'Ok') {
    throw new Error(status?.Message || '短信发送失败')
  }
  return result
}

module.exports = { sendSms }
