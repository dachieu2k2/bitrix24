import axios from 'axios'
import { existsSync, readFileSync, writeFileSync } from 'fs'

import { Token } from '~/models/bitrixAuth.model'

const TOKEN_FILE = './public/tokens.json'

export const readFileTokenJson = () => {
  if (!existsSync(TOKEN_FILE)) return {}

  const token = readFileSync(TOKEN_FILE, 'utf8')
  return JSON.parse(token) || null
}

export const writeFileTokenJson = (token: Token) => {
  writeFileSync(TOKEN_FILE, JSON.stringify(token, null, 2), 'utf8')
}

export const getTokenFirstTime = async (code: string) => {
  try {
    const response = await axios.post(process.env.BITRIX_OAUTH_URL + '', null, {
      params: {
        client_id: process.env.CLIENT_ID + '',
        client_secret: process.env.CLIENT_SECRET + '',
        grant_type: 'authorization_code',
        code: code
      }
    })

    if (response.data) {
      writeFileTokenJson({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token
      })
    }

    return { access_token: response.data.access_token }
  } catch (error) {
    console.error(error)
    return null
  }
}

export const refreshToken = async (refresh_token: string) => {
  try {
    const response = await axios.post(process.env.BITRIX_OAUTH_URL + '', null, {
      params: {
        client_id: process.env.CLIENT_ID + '',
        client_secret: process.env.CLIENT_SECRET + '',
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      }
    })

    if (response.data) {
      writeFileTokenJson({
        access_token: response.data?.access_token,
        refresh_token: response.data?.refresh_token
      })
    }

    return { access_token: response.data?.access_token }
  } catch (error) {
    console.error(error)
    return null
  }
}
