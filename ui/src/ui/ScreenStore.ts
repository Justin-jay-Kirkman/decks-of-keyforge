import { observable } from "mobx"

export class ScreenStore {

    private static innerInstance: ScreenStore

    @observable
    screenWidth: number

    @observable
    private screenSize: ScreenSize = ScreenSize.md

    private constructor() {
        this.screenWidth = window.innerWidth
        this.onResize()
        window.addEventListener("resize", this.onResize)
    }

    static get instance() {
        return this.innerInstance || (this.innerInstance = new this())
    }

    screenSizeXs = () => this.screenSize === ScreenSize.xs
    screenSizeSm = () => this.screenSize !== ScreenSize.md

    private onResize = () => {
        this.screenWidth = window.innerWidth
        if (this.screenWidth < 600) {
            this.screenSize = ScreenSize.xs
        } else if (this.screenWidth < 960) {
            this.screenSize = ScreenSize.sm
        } else {
            this.screenSize = ScreenSize.md
        }
    }
}

export enum ScreenSize {
    xs,
    sm,
    md
}