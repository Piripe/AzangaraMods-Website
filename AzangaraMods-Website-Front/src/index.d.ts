type LevelDifficulties = 10 | 20 | 30 | 40 | 50 | 60;
type LevelVerificationStatus = 0 | 10 | 20 | 30;

type User = {
    id: string,
    username: string,
    creation: string,
    lastLogin: string,
    email: string,
    hasProfilePicture: boolean,
    verifiedModder?: boolean,
    admin?: boolean,
    levels: Level[]|undefined,
}
type Level = {
    id: string,
    name: string,
    description: string,
    authorId: string,
    lastEdit: string,
    created: string,
    difficulty: LevelDifficulties,
    roomAmount: number,
    published: boolean,
    verification: LevelVerificationStatus,
    verificationRequested: string|null,
    verificationNote: string|null,
    author: User|null|undefined,
    tags: string[]|undefined,
    galleryFiles: GalleryFile[]|undefined,
    levelFiles: LevelFile[]|undefined,
    downloads?: number,
}
type LevelSearchHit = Level & {
    downloads: number,
    thumbnailId: string|null,
}
type AdminLevelHit = LevelSearchHit & {
    fileCount: number,
    hasDiscordMessage: boolean,
    latestFileId: string|null,
    latestFileName: string|null,
}
type LevelSearchResult<T extends LevelSearchHit = LevelSearchHit> = {
    hits: T[],
    totalHits: number,
    offset: number,
    limit: number,
}
type TagCount = {
    tag: string,
    count: number,
}
type LevelFile = {
    id: string,
    levelId: string,
    uploadDate: string,
    entryPoint: string,
    fileName: string,
    fileSize: number,
    downloads?: number,
    level: Level|null|undefined,
}
type GalleryFile = {
    id: string,
    levelId: string,
    uploadDate: string,
    description?: string,
    fileName: string,
    level: Level|null|undefined,
}
type ErrorResponse = {
    error: string,
    errorCode: ErrorCodes,
    additionalData?: string|undefined|null
}
type LoginResponseData = {
    token: string,
    user: User
}
type AdminTaskResponseData = {
    succeeded: number,
    failed: number,
    errors: string[],
}
type Session = {
    id: string,
    created: string,
    lastUsed: string,
    userAgent: string|null,
    ipAddress: string|null,
    current: boolean,
}
type LevelFileUploadResponseData = {
    id: string,
    files: string[],
}