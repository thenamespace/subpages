'use client'

import { TelegramIcon, XIcon } from './Icons'
import { resolveAvatarUrl } from '@/lib/utils'

export function ProfileCard({ profile }: { profile: any }) {
  const avatarRecord = profile.texts?.avatar
  const avatarUrl = resolveAvatarUrl(avatarRecord) || '/default-avatar.jpg'
  const twitter = profile.texts?.['com.twitter']
  const telegram = profile.texts?.['org.telegram']
  const hasSocials = twitter || telegram

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
      <img
        src={avatarUrl}
        alt={profile.name}
        className="h-12 w-12 rounded-full bg-brand-light object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = '/default-avatar.jpg'
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
