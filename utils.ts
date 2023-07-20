import { promisify } from 'node:util'
import stream from 'node:stream'
import got from 'got'
import fse from 'fs-extra'
import path from 'path'

const pipeline = promisify(stream.pipeline)

export enum ILessonDataType {
  Image = '1',
  Video = '2',
  Text = '3'
}

export interface ILessonData {
  url: string
  type: ILessonDataType
}

export interface ILesson {
  lesson_id: string
  dated: string
  comment_info: {
    content: string
    data: ILessonData[]
    created: string
  }
}

export async function getLessonData(form: any, cookie: string): Promise<ILesson[]> {
  try {
    // @ts-ignore
    const { data } = await got
      .post('https://jwb.sc-edu.com/api/wx/lesson_comment_list/', {
        form,
        headers: {
          cookie
        }
      })
      .json()
    return data.lists
  } catch (error) {
    console.error(error)
    return []
  }
}

export async function downloadAsset(url: string, dest: string) {
  if (!fse.pathExistsSync(dest)) {
    fse.ensureDirSync(dest)
  }
  const destFile = path.join(dest, path.basename(url))
  if (!fse.pathExistsSync(destFile)) {
    await pipeline(
      //
      got.stream(url),
      fse.createWriteStream(destFile)
    )
    console.log(`${url} downloaded!`)
  } else {
    // console.log(`${url} skipped!`)
  }
  return destFile
}

export function outputMd({
  date,
  content,
  images,
  videos
}: {
  date: string
  content: string
  images: string[]
  videos: string[]
}) {
  let mdContent = `# ${date}\n\n`

  if (content) {
    mdContent += content.replace(/\n/g, '\n\n') + '\n\n'
  }

  if (images.length) {
    mdContent +=
      images
        .map(url => {
          const filename = path.basename(url)
          return `![${filename}](${filename})`
        })
        .join('\n\n') + '\n\n'
  }

  if (videos.length) {
    mdContent +=
      videos
        .map(url => {
          const filename = path.basename(url)
          return `<video src="${filename}" controls="controls"></video>`
        })
        .join('\n\n') + '\n\n'
  }

  return mdContent
}
