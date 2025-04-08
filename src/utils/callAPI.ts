import axios, { AxiosRequestConfig } from 'axios'
import { readFileTokenJson, refreshToken } from '~/controllers/bitrixAuth.controller'

const client = axios.create({
  baseURL: process.env.BITRIX_API_URL,
  timeout: 30000,
  timeoutErrorMessage: '🚧🚧🚧 Server connection time out !',
  params: {
    auth: ''
  }
})

interface RetryQueueItem {
  resolve: (value?: any) => void
  reject: (error?: any) => void
  config: AxiosRequestConfig
}

const refreshAndRetryQueue: RetryQueueItem[] = []
let isRefreshing = false

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest: AxiosRequestConfig = error.config
    console.log(error.config)

    if (error.response && error.response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { refresh_token } = readFileTokenJson()
          if (refresh_token) {
            const token = await refreshToken(refresh_token)
            if (token && token.access_token) {
              originalRequest.params['auth'] = token.access_token
              return client(originalRequest)
            }
            // Repeat all miss request by 401
            refreshAndRetryQueue.forEach(({ config, resolve, reject }) => {
              client(config)
                .then((response) => resolve(response))
                .catch((err) => reject(err))
            })
            refreshAndRetryQueue.length = 0
          } else {
            return Promise.reject(error)
          }
        } catch (refreshError) {
          refreshAndRetryQueue.length = 0
        } finally {
          isRefreshing = false
        }
      }
      return new Promise<void>((resolve, reject) => {
        refreshAndRetryQueue.push({ config: originalRequest, resolve, reject })
      })
    }
    return Promise.reject(error)
  }
)

export const request = async (options: AxiosRequestConfig, additional?: { token?: string }) => {
  client.defaults.params['auth'] = additional?.token || ''

  const onSuccess = (response: any) => {
    return response
  }
  const onError = async (error: any) => {
    console.log(process.env.BITRIX_API_URL, error, options)

    await Promise.reject({
      statusCode: error?.response?.status,
      error: error?.response?.data?.error,
      error_description: error?.response?.data?.error_description
    })
  }
  return client(options).then(onSuccess).catch(onError)
}

/**
 * Use for all api
 *
 * @action actions crm.requisite.bankdetail.update, crm.requisite.bankdetail.add, crm.requisite.bankdetail.list
 * @payload payload sent to Bitrix
 * @return return data after call api Bitrix
 */
export const callApiBitrix = async (action: any, payload: any) => {
  try {
    const { access_token } = await readFileTokenJson()
    const response = await request({ url: `${action}`, method: 'POST', data: payload }, { token: access_token })
    return response
  } catch (error) {
    console.log(error)
  }
}
