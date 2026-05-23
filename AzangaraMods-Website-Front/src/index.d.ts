type LevelDifficulties = 10 | 20 | 30 | 40 | 50 | 60;

type User = {
    id: string,
    username: string,
    creation: string,
    lastLogin: string,
    email: string,
    hasProfilePicture: boolean,
    levels: Level[]|undefined,
}
type Level = {
    id: string,
    name: string,
    description: string,
    authorId: string,
    lastEdit: string,
    difficulty: LevelDifficulties,
    roomAmount: number,
    published: boolean,
    author: User|null|undefined,
    tags: string[]|undefined,
    galleryFiles: GalleryFile[]|undefined,
    levelFiles: LevelFile[]|undefined,
}
type LevelFile = {
    id: string,
    levelId: string,
    uploadDate: string,
    entryPoint: string,
    fileName: string,
    fileSize: number,
    level: Level|null|undefined,
}
type GalleryFile = {
    id: string,
    levelId: string,
    uploadDate: string,
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
type RegisterResponseData = {
    status: string
}
type LevelFileUploadResponseData = {
    id: string,
    files: string[],
}