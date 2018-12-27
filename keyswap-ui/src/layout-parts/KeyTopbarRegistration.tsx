import AppBar from "@material-ui/core/AppBar/AppBar"
import IconButton from "@material-ui/core/IconButton/IconButton"
import Toolbar from "@material-ui/core/Toolbar/Toolbar"
import Typography from "@material-ui/core/Typography/Typography"
import ArrowBack from "@material-ui/icons/ArrowBack"
import * as React from "react"
import { RouteComponentProps, withRouter } from "react-router-dom"
import { spacing } from "../config/MuiConfig"
import { ToolbarSpacer } from "../mui-restyled/ToolbarSpacer"

interface KeyTopbarRegistrationProps extends RouteComponentProps<{}> {
    name: string
    rightContent: React.ReactNode
    children: React.ReactNode
}

class KeyTopbarRegistrationBase extends React.Component<KeyTopbarRegistrationProps> {

    render() {
        const {name, rightContent, history, children} = this.props

        return (
            <div>
                <AppBar position={"fixed"} style={{zIndex: 10000}}>
                    <Toolbar>
                        <IconButton onClick={history.goBack} style={{marginRight: spacing(2)}} color={"inherit"}>
                            <ArrowBack/>
                        </IconButton>
                        <Typography
                            variant={"h4"}
                            style={{marginLeft: spacing(2)}}
                            color={"inherit"}>
                            {name}
                        </Typography>
                        <div
                            style={{flexGrow: 1}}
                        />
                        {rightContent}
                    </Toolbar>
                </AppBar>
                <ToolbarSpacer/>
                {children}
            </div>
        )
    }
}

export const KeyTopbarRegistration = withRouter(KeyTopbarRegistrationBase)
