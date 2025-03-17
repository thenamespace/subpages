'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'


import { TelegramIcon, XIcon } from './Icons'

const transparentImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E'

export function ProfileCard({ profile }: { profile: any }) {
  const [avatarUrl, setAvatarUrl] = useState<string>()
  const twitter = profile.texts?.['com.twitter']
  const telegram = profile.texts?.['org.telegram']
  const hasSocials = twitter || telegram
  const avatarRecord = profile.texts?.avatar

  useEffect(() => {
    setAvatarUrl(
      "https://ipfs.io/ipfs/bafkreiac2vzw6ky2mk4e27rkvb7n26xfsvhljgo3mxcbutkcamn2s3qene"
    )
  }, [avatarRecord])

  const formatName = (name: string) => {
    if (name.length > 20) {
      return `${name.slice(0, 5)}...${name.slice(-9)}`
    }
    return name
  }

  return (
    <div
      key={profile.name}
      className="flex flex-col items-center gap-3 rounded-lg bg-gradient-card p-4"
    >
      <Image
        src={avatarUrl ?? transparentImage}
        alt={profile.name}
        width={48}
        height={48}
        className="h-12 w-12 rounded-full bg-brand-light object-cover"
        onError={() => {
          setAvatarUrl(transparentImage)
        }}
      />
      <span>
      {formatName(profile.name)}
      </span>

      {/* Socials */}
      {hasSocials && (
        <div className="flex items-center gap-2">
          {twitter && (
            <a href={`https://twitter.com/${twitter}`} target="_blank">
              <XIcon className="h-4 w-4" />
            </a>
          )}

          {telegram && (
            <a href={`https://t.me/${telegram}`} target="_blank">
              <TelegramIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
