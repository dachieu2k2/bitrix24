export enum SortByEnum {
  ASC = 'ASC',
  DESC = 'DESC'
}

export interface IParams {
  page: number
  limit: number
  orderBy: string
  sortBy: string
  searchBy: string
  s?: string
}

export interface IErrorResponseThirdParty {
  response: any
  message: string
}
