import { downloadAsset, getLessonData, ILessonDataType, outputMd } from './utils'
import fse from 'fs-extra'
import path from 'path'
import * as dotenv from 'dotenv'

dotenv.config()

const form = {
  mem_id: process.env.MEM_ID,
  comment_reply: '-1'
}

const cookie = process.env.COOKIE ?? ''

const dist = process.env.DIST ?? ''

main()

export async function main() {
  if (!fse.pathExistsSync(dist)) {
    fse.ensureDirSync(dist)
  }

  const lessons = await getLessonData(form, cookie)

  const missLessons = lessons
    //
    .filter(lesson => {
      // 找到不存在的日期
      return !fse.pathExistsSync(path.join(dist, lesson.dated))
    })

  // console.log(missLessons)
  if (missLessons.length === 0) {
    console.log(`everything is up-to-date!`)
  }

  for (const lesson of missLessons) {
    // 创建日期文件夹
    const lessonPath = path.join(dist, lesson.dated)
    if (!fse.pathExistsSync(lessonPath)) {
      fse.ensureDirSync(lessonPath)
    }

    const lessonData = lesson.comment_info.data

    const images = lessonData
      //
      .filter(item => item.type === ILessonDataType.Image)
      .map(item => item.url)

    const videos = lessonData
      //
      .filter(item => item.type === ILessonDataType.Video)
      .map(item => item.url)

    const content = lessonData.find(item => item.type === ILessonDataType.Text)?.url ?? ''

    for (const url of images) {
      await downloadAsset(url, lessonPath)
    }
    for (const url of videos) {
      await downloadAsset(url, lessonPath)
    }

    fse.outputFileSync(
      path.join(lessonPath, 'readme.md'),
      outputMd({
        date: lesson.dated,
        content,
        images,
        videos
      })
    )
    console.log(`${lesson.dated} archived!`)
  }
}
