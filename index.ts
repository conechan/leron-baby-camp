import { downloadAsset, getLessonData, ILessonDataType, outputMd } from './utils'
import fse from 'fs-extra'
import path from 'path'
import * as dotenv from 'dotenv'
import { exiftool } from 'exiftool-vendored'

// exiftool.version().then(version => console.log(`We're running ExifTool v${version}`))

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
      const filePath = await downloadAsset(url, lessonPath)
      // console.log(lesson.comment_info.created.replace(/\s/, 'T'))
      try {
        await exiftool.write(filePath, {
          AllDates: lesson.comment_info.created.replace(/\s/, 'T'),
          TimeZoneOffset: 8
        })
        fse.removeSync(filePath + '_original')
      } catch (error) {
        console.error(error)
      }
      // console.log(filePath)
    }
    for (const url of videos) {
      const filePath = await downloadAsset(url, lessonPath)
      try {
        await exiftool.write(filePath, {
          AllDates: lesson.comment_info.created.replace(/\s/, 'T'),
          TimeZoneOffset: 8
        })
        fse.removeSync(filePath + '_original')
      } catch (error) {
        console.error(error)
      }
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
  exiftool.end()
}
