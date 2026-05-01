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
    author: string,
    name: string,
    authorId: string,
    lastEdit: string,
    author: User|null|undefined,
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
    error: string
}
type LoginResponseData = {
    token: string,
    user: User
}
type RegisterResponseData = {
    status: string
}