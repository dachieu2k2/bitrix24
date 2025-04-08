import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import expressPartials from 'express-partials'
config()

import { addTimestamp, errorHandler, logger } from './middlewares'
import { getTokenFirstTime, readFileTokenJson, writeFileTokenJson } from './controllers/bitrixAuth.controller'
import { callApiBitrix } from './utils/callAPI'

const app = express()

app.set('view engine', 'ejs')
app.use(express.json())
app.use(cors())
app.use(expressPartials())
app.use(addTimestamp)
app.use(logger)
app.use(express.urlencoded({ extended: true }))

app.get('/contacts/:id/delete', async (req, res) => {
  const { id } = req.params
  await callApiBitrix('crm.contact.delete', {
    id: id
  })
  res.redirect('/contacts')
})

app.get('/contacts/add', async (req, res) => {
  res.render('contacts/add', { title: 'Add User' })
})

app.get('/contacts/:id/edit', async (req, res) => {
  const { id } = req.params

  const responseContact = await callApiBitrix('crm.contact.get', {
    id: id
  })

  const response = await callApiBitrix('crm.requisite.list', {
    filter: {
      ENTITY_ID: id,
      ENTITY_TYPE_ID: 3
    }
  })
  const dataRender = {
    dataContact: responseContact?.data?.result,
    dataRequisite: response?.data?.result[0],
    dataBank: {}
  }

  const responseBank = await callApiBitrix('crm.requisite.bankdetail.list', {
    filter: {
      ENTITY_ID: response.data?.result[0]?.ID || 0
    }
  })
  if (responseBank.data?.result.length >= 1) {
    const responseBankDetail = await callApiBitrix('crm.requisite.bankdetail.get', {
      id: responseBank.data?.result[0]?.ID || 0
    })
    dataRender.dataBank = responseBankDetail?.data?.result || {}
  }

  res.render('contacts/edit', dataRender)
})

app.post('/contacts/:id/edit', async (req, res) => {
  const { id } = req.params
  const { idBank } = req.query
  const body = req.body
  const { dataContact, dataBank } = body

  const dataContactFinal = {
    ...dataContact,
    PHONE: dataContact.PHONE ? [{ VALUE: dataContact.PHONE, VALUE_TYPE: 'WORK' }] : [],
    EMAIL: dataContact.EMAIL ? [{ VALUE: dataContact.EMAIL, VALUE_TYPE: 'WORK' }] : [],
    WEB: dataContact.WEB ? [{ VALUE: dataContact.WEB, VALUE_TYPE: 'CORPORATE' }] : []
  }

  const dataBankFinal = {
    NAME: 'Bank Detail', // Name of the bank detail
    ...dataBank
  }

  await callApiBitrix('crm.contact.update', { id: id, fields: dataContactFinal })

  console.log(idBank, {
    ...dataBankFinal
  })

  idBank &&
    (await callApiBitrix('crm.requisite.bankdetail.update', {
      id: idBank,
      fields: {
        ...dataBankFinal
      }
    }))

  res.redirect('/contacts')
})

app.post('/contacts', async (req, res) => {
  const body = req.body
  const { dataContact, dataAddress, dataBank } = body

  const dataContactFinal = {
    NAME: 'Phạm Đắc Hiếu',
    COMMENTS: 'Khách hàng VIP',
    SOURCE_ID: 'WEB',
    SOURCE_DESCRIPTION: 'Clients come from Dachieu server',
    ...dataContact,
    PHONE: dataContact.PHONE ? [{ VALUE: dataContact.PHONE, VALUE_TYPE: 'WORK' }] : [],
    EMAIL: dataContact.EMAIL ? [{ VALUE: dataContact.EMAIL, VALUE_TYPE: 'WORK' }] : [],
    WEB: dataContact.WEB ? [{ VALUE: dataContact.WEB, VALUE_TYPE: 'CORPORATE' }] : []
  }

  const dataAddressFinal = {
    TYPE_ID: 1, // Address type, see crm.enum.addresstype
    ENTITY_TYPE_ID: 3,
    ...dataAddress
  }

  const dataRequisite = {
    ENTITY_TYPE_ID: 3, // Contact
    PRESET_ID: 3,
    TITLE: 'Hello',
    NAME: 'PERSON'
  }

  const dataBankFinal = {
    NAME: 'Bank Detail', // Name of the bank detail
    ...dataBank
  }

  const responseContact = await callApiBitrix('crm.contact.add', { fields: dataContactFinal })
  console.log(responseContact?.data?.result)

  const responseRequisite = await callApiBitrix('crm.requisite.add', {
    fields: {
      ...dataRequisite,
      ENTITY_ID: responseContact?.data?.result
    }
  })

  await callApiBitrix('crm.address.add', {
    fields: {
      ...dataAddressFinal,
      ENTITY_ID: responseContact?.data?.result
    }
  })

  await callApiBitrix('crm.requisite.bankdetail.add', {
    fields: {
      ...dataBankFinal,
      ENTITY_ID: responseRequisite?.data?.result
    }
  })

  res.redirect('/contacts')
})

app.get('/', async (req, res) => {
  try {
    res.render('index')
  } catch (error) {
    console.log(error)
  }
})

app.get('/imconnectors-list', async (req, res) => {
  try {
    const response = await callApiBitrix('imconnector.list', {})
    console.log(response)

    return res.json({ test: 'sad', data: response })
  } catch (error) {
    return res.json({ error })
  }
})

app.get('/imconnectors-status', async (req, res) => {
  try {
    const response = await callApiBitrix('imconnector.status', { CONNECTOR: 'APP_CHAT_SIEU_CAP_DIA_NGUC' })
    console.log('status', response)

    return res.json({ test: 'ettsttss', data: response?.data?.result })
  } catch (error) {
    return res.json({ error })
  }
})

app.get('/chat-add', async (req, res) => {
  try {
    const response = await callApiBitrix('im.chat.add', {
      TYPE: 'OPEN',
      TITLE: 'Test chat 2',
      DESCRIPTION: 'helo wwoorld',
      COLOR: 'RED',
      MESSAGE: 'Welcome to this group chat',
      USER: [1, 2, 3]
    })
    console.log('active', response)

    return res.json({ test: 'ettsttss', data: response?.data?.result })
  } catch (error) {
    return res.json({ error })
  }
})

app.get('/user-get', async (req, res) => {
  try {
    const response = await callApiBitrix('user.get', {})
    console.log('active', response)

    return res.json({ test: 'ettsttss', data: response?.data?.result })
  } catch (error) {
    return res.json({ error })
  }
})

app.get('/send_messages', async (req, res) => {
  try {
    const response = await callApiBitrix('imconnector.send.messages', {
      CONNECTOR: 'APP_CHAT_BY_DACHIEU',
      LINE: 31,
      MESSAGES: [
        {
          user: {
            id: '233322332233232', // User ID in the external system *
            last_name: 'High', // Last name
            name: 'Tech', // First name
            picture: {
              url: 'https://picsum.photos/200' // Link to the user's avatar available for the account
            },
            url: 'https://picsum.photos/200', // Link to the user's profile
            sex: 'Male', // Gender. Acceptable values are male and female
            email: 'hihi@gmail.com', // Email
            phone: '+442012345678', // Phone
            skip_phone_validate: 'Y' // Value 'Y' allows skipping validation
            // of the user's phone number. By default
          },
          message: {
            id: '222123123', // Message ID in the external system *
            date: '3/4/2024', // Message time in timestamp format *
            disable_crm: 'Y', // Disable chat tracker (CRM tracker)
            text: 'hello toi muon mua hang' // Message text. Either the text or files element must be specified.
            // Allowed formatting (BB codes) is described
            // here: https://apidocs.bitrix24.com/api-reference/chats/messages/index.html
            // files: [
            //   // Array of file descriptions, where each file is described
            //   // by an object with a link available for the account
            //   { url: 'Link to file', name: 'File name' },
            //   { url: 'Link to file', name: 'File name' }
            // ]
          },
          chat: {
            id: '213123321123', // Chat ID in the external system *
            name: 'Heloooo Girl ' // Chat name in the external system
            // url: 'https://726e-125-235-2-218.ngrok-free.app/link_external' // Link to the chat in the external system
          }
        }
      ]
    })
    console.log(response?.data?.result?.DATA?.RESULT[0].ERRORS)
    console.log(response?.data?.result?.DATA?.RESULT)

    return res.json({ test: 'sad', data: response })
  } catch (error) {
    return res.json({ error })
  }
})

app.get('/imconnector-send-status-delivery', async (req, res) => {
  try {
    console.log('get', req.body)

    const data = await callApiBitrix('imconnector.send.status.delivery', {
      CONNECTOR: 'APP_CHAT_BY_DACHIEU',
      LINE: 31,
      MESSAGES: [
        {
          im: '12',
          user: {
            id: '1', // User ID in the external system *
            last_name: 'Pham', // Last name
            name: 'HIeu', // First name
            picture: {
              url: 'https://picsum.photos/200' // Link to the user's avatar available for the account
            },
            url: 'https://picsum.photos/200', // Link to the user's profile
            sex: 'Male', // Gender. Acceptable values are male and female
            email: 'hihi@gmail.com', // Email
            phone: '01391231', // Phone
            skip_phone_validate: 'Y' // Value 'Y' allows skipping validation
            // of the user's phone number. By default
          },
          message: {
            id: '132', // Message ID in the external system *
            date: '3/4/2024', // Message time in timestamp format *
            disable_crm: 'Y', // Disable chat tracker (CRM tracker)
            text: 'Lorem inroasda ljasdljasd kl jasjdasd l' // Message text. Either the text or files element must be specified.
            // Allowed formatting (BB codes) is described
            // here: https://apidocs.bitrix24.com/api-reference/chats/messages/index.html
            // files: [
            //   // Array of file descriptions, where each file is described
            //   // by an object with a link available for the account
            //   { url: 'Link to file', name: 'File name' },
            //   { url: 'Link to file', name: 'File name' }
            // ]
          },
          chat: {
            id: '14', // Chat ID in the external system *
            name: 'Heloooo Girl ', // Chat name in the external system
            url: 'https://726e-125-235-2-218.ngrok-free.app/link_external' // Link to the chat in the external system
          }
        }
      ]
    })
    console.log(data?.data)
    return res.json({ message: 'success' })
  } catch (error) {
    console.log(error)
  }
})

app.post('/link_external', async (req, res) => {
  try {
    console.log('post', req.body)
  } catch (error) {
    console.log(error)
  }
})

app.get('/link_external', async (req, res) => {
  try {
    console.log('get', req.body)
  } catch (error) {
    console.log(error)
  }
})

app.get('/imconnectors-active', async (req, res) => {
  try {
    const response = await callApiBitrix('imconnector.activate', {
      CONNECTOR: 'APP_CHAT_SIEU_CAP_DIA_NGUC',
      LINE: 0,
      ACTIVE: 1
    })
    console.log('active', response)

    return res.json({ test: 'ettsttss', data: response?.data?.result })
  } catch (error) {
    return res.json({ error })
  }
})

app.get('/imconnectors-register', async (req, res) => {
  try {
    const bodyDataConnect = {
      ID: 'APP_CHAT_BY_DACHIEU',
      NAME: 'APP_CHAT_BY_DACHIEU',
      ICON: {
        DATA_IMAGE:
          'data:image/svg+xml;charset=US-ASCII,%3Csvg%20version%3D%221.1%22%20id%3D%22Layer_1%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20x%3D%220px%22%20y%3D%220px%22%0A%09%20viewBox%3D%220%200%2070%2071%22%20style%3D%22enable-background%3Anew%200%200%2070%2071%3B%22%20xml%3Aspace%3D%22preserve%22%3E%0A%3Cpath%20fill%3D%22%230C99BA%22%20class%3D%22st0%22%20d%3D%22M34.7%2C64c-11.6%2C0-22-7.1-26.3-17.8C4%2C35.4%2C6.4%2C23%2C14.5%2C14.7c8.1-8.2%2C20.4-10.7%2C31-6.2%0A%09c12.5%2C5.4%2C19.6%2C18.8%2C17%2C32.2C60%2C54%2C48.3%2C63.8%2C34.7%2C64L34.7%2C64z%20M27.8%2C29c0.8-0.9%2C0.8-2.3%2C0-3.2l-1-1.2h19.3c1-0.1%2C1.7-0.9%2C1.7-1.8%0A%09v-0.9c0-1-0.7-1.8-1.7-1.8H26.8l1.1-1.2c0.8-0.9%2C0.8-2.3%2C0-3.2c-0.4-0.4-0.9-0.7-1.5-0.7s-1.1%2C0.2-1.5%2C0.7l-4.6%2C5.1%0A%09c-0.8%2C0.9-0.8%2C2.3%2C0%2C3.2l4.6%2C5.1c0.4%2C0.4%2C0.9%2C0.7%2C1.5%2C0.7C26.9%2C29.6%2C27.4%2C29.4%2C27.8%2C29L27.8%2C29z%20M44%2C41c-0.5-0.6-1.3-0.8-2-0.6%0A%09c-0.7%2C0.2-1.3%2C0.9-1.5%2C1.6c-0.2%2C0.8%2C0%2C1.6%2C0.5%2C2.2l1%2C1.2H22.8c-1%2C0.1-1.7%2C0.9-1.7%2C1.8v0.9c0%2C1%2C0.7%2C1.8%2C1.7%2C1.8h19.3l-1%2C1.2%0A%09c-0.5%2C0.6-0.7%2C1.4-0.5%2C2.2c0.2%2C0.8%2C0.7%2C1.4%2C1.5%2C1.6c0.7%2C0.2%2C1.5%2C0%2C2-0.6l4.6-5.1c0.8-0.9%2C0.8-2.3%2C0-3.2L44%2C41z%20M23.5%2C32.8%0A%09c-1%2C0.1-1.7%2C0.9-1.7%2C1.8v0.9c0%2C1%2C0.7%2C1.8%2C1.7%2C1.8h23.4c1-0.1%2C1.7-0.9%2C1.7-1.8v-0.9c0-1-0.7-1.8-1.7-1.9L23.5%2C32.8L23.5%2C32.8z%22/%3E%0A%3C/svg%3E%0A',
        COLOR: '#1900ff',
        SIZE: '90%',
        POSITION: 'center'
      },
      PLACEMENT_HANDLER: 'https://726e-125-235-2-218.ngrok-free.app/handle_chat_app'
    }

    const response = await callApiBitrix('imconnector.register', bodyDataConnect)
    return res.json({ test: 'ettsttss', response })
  } catch (error) {
    return res.json({ error })
  }
})

// Unused this momment
app.post('/handle_chat_app', async (req, res) => {
  try {
    console.log('post-handle_chat_app', req.body)

    const setupApp = JSON.parse(req.body.PLACEMENT_OPTIONS)

    console.log(setupApp)

    const response = await callApiBitrix('imconnector.activate', {
      CONNECTOR: setupApp?.CONNECTOR,
      LINE: setupApp?.LINE,
      ACTIVE: setupApp?.ACTIVE_STATUS ? 1 : 0,
      // STATUS: true,
      // ACTIVE_STATUS: true,
      // CONNECTION_STATUS: true,
      // REGISTER_STATUS: true,
      // ERROR_STATUS: false
    })
    return res.json({ message: 'success', data: response.data })
  } catch (error) {
    console.log(error)
  }
})

app.get('/config-imconnector', async (req, res) => {
  try {
    const response = await callApiBitrix('imconnector.connector.data.set', {
      LINE: 31,
      CONNECTOR: 'APP_CHAT_BY_DACHIEU',
      DATA: {
        id: 1,
        url: 'https://726e-125-235-2-218.ngrok-free.app/handle_messages',
        url_im: 'https://726e-125-235-2-218.ngrok-free.app/handle_messages',
        name: 'Phuong hoang'
      }
    })
    return res.json({ message: 'success', data: response.data })
  } catch (error) {
    console.log(error)
  }
})
app.post('/handle_messages', async (req, res) => {
  console.log('get', req.body)
  return res.send('success')
})

app.get('/handle_chat_app', async (req, res) => {
  console.log('get', req.body)
  return res.send('success')
})

app.get('/cmd/:cmd', async (req, res) => {
  try {
    const { cmd } = req.params
    const body = req.query
    console.log(cmd, body)
    const response = await callApiBitrix(cmd, body)

    console.log(response?.data)

    return res.json({
      message: 'success',
      data: response?.data
    })
  } catch (error) {
    console.log(error)
  }
})

app.get('/contacts', async (req, res) => {
  try {
    const { sorting_field = 'DATE_CREATE', sorting_direction = 'DESC', start = '1' } = req.query
    console.log(sorting_field, sorting_direction)

    const response = await callApiBitrix('crm.contact.list', {
      order: {
        [sorting_field + '']: sorting_direction
      },
      start: (Number(start) - 1) * 50
    })
    res.render('contacts/index', { contacts: response?.data?.result || [] })
  } catch (error) {
    console.log(error)
  }
})

app.post('/install', async (req, res) => {
  try {
    console.log('run install', req.body)

    writeFileTokenJson(req.body?.auth)

    return res.redirect(`${process.env.BITRIX_API_OAUTH}?response_type=code&client_id=${process.env.CLIENT_ID}`)
  } catch (error) {
    console.log(error)
    return null
  }
})

app.get('/install', async (req, res) => {
  try {
    console.log('run install')

    return res.redirect(`${process.env.BITRIX_API_OAUTH}?response_type=code&client_id=${process.env.CLIENT_ID}`)
  } catch (error) {
    console.log(error)
    return null
  }
})

app.get('/handler', async (req, res) => {
  try {
    const { code } = req.query

    console.log('received event', req.body)

    await getTokenFirstTime(code as string)

    return res.redirect('/')
  } catch (error) {
    console.log(error)
    return null
  }
})

app.post('/handler', async (req, res) => {
  try {
    const { code } = req.query

    console.log('received event', req.body)

    await getTokenFirstTime(code as string)

    return res.redirect('/')
  } catch (error) {
    console.log(error)
    return null
  }
})

app.use(errorHandler)

const PORT = process.env.PORT || 4000

app.listen(PORT, () => console.log(`App listen on PORT: ${PORT}`))
