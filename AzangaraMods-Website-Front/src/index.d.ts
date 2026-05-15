enum ErrorCodes {
    AuthLoginInvalid = 0x00,
    AuthRegisterUnknownError = 0x01,
    AuthLogoutNoChange = 0x02,
    DownloadLevelNotFound = 0x03,
    DownloadLevelRestricted = 0x04,
    DownloadLevelFileNotFound = 0x05,
    DownloadLevelFileUnsupportedType = 0x06,
    DownloadGalleryFileNotFound = 0x07,
    LevelGetNotFound = 0x08,
    LevelGetRestricted = 0x09,
    LevelPutNameTooLong = 0x0A,
    LevelPutNameTooShort = 0x0B,
    LevelPutDescriptionTooLong = 0x0C,
    LevelPutDescriptionTooShort = 0x0D,
    LevelPutTooManyTags = 0x0E,
    LevelPutTagTooLong = 0x0F,
    LevelEditNotYours = 0x10,
    LevelPatchNull = 0x11,
    LevelPatchNotFound = 0x12,
    LevelFilePutNull = 0x13,
    LevelFilePutPakTooBig = 0x14,
    LevelFilePutPakError = 0x15,
    LevelFilePutZipTooManyFiles = 0x16,
    LevelFilePutZipTooBig = 0x17,
    LevelFilePutInvalidFileType = 0x18,
    LevelFilePatchNull = 0x19,
    LevelFilePatchLevelNotFound = 0x1A,
    LevelFileDeleteNotFound = 0x1B,
    LevelFileDeleteLevelNotFound = 0x1C,
    LevelGalleryPutNull = 0x1D,
    LevelGalleryPutInvalidFileType = 0x1E,
    LevelGalleryDeleteNotFound = 0x1F,
    LevelGalleryDeleteLevelNotFound = 0x20,
    UserMeNotFound = 0x21
}
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
    difficulty: number,
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