import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import expressPartials from 'express-partials'
config()

import { addTimestamp, errorHandler, logger } from './middlewares'
import { getTokenFirstTime, readFileTokenJson } from './controllers/bitrixAuth.controller'
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
    return res.redirect(`${process.env.BITRIX_API_OAUTH}?response_type=code&client_id=${process.env.CLIENT_ID}`)
  } catch (error) {
    console.log(error)
    return null
  }
})

app.get('/handler', async (req, res) => {
  try {
    const { code } = req.query

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
