import {
    Button,
    CardActions,
    Checkbox,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select
} from "@material-ui/core"
import TextField from "@material-ui/core/es/TextField"
import Typography from "@material-ui/core/Typography"
import { observable } from "mobx"
import { observer } from "mobx-react"
import * as React from "react"
import ReactDOM from "react-dom"
import { spacing } from "../config/MuiConfig"
import { Routes } from "../config/Routes"
import { DeckFilters } from "../decks/search/DeckFilters"
import { countries, countryToLabel } from "../generic/Country"
import { KeyCard } from "../generic/KeyCard"
import { LinkButton } from "../mui-restyled/LinkButton"
import { Loader } from "../mui-restyled/Loader"
import { MessageStore } from "../ui/MessageStore"
import { UiStore } from "../ui/UiStore"
import { UserProfile } from "./UserProfile"
import { UserStore } from "./UserStore"

@observer
export class MyProfile extends React.Component {
    render() {
        const profile = UserStore.instance.userProfile
        if (!profile) {
            return <Loader/>
        }
        return <MyProfileInner profile={profile}/>
    }
}

interface MyProfileInnerProps {
    profile: UserProfile
}

@observer
class MyProfileInner extends React.Component<MyProfileInnerProps> {

    @observable
    contactInfo: string
    @observable
    allowUsersToSeeDeckOwnership: boolean
    @observable
    country: string
    @observable
    preferredCountries: string[]

    @observable
    preferredCountriesLabelWidth = 0

    buyingCountriesInputLabelRef: any

    constructor(props: MyProfileInnerProps) {
        super(props)
        const {publicContactInfo, allowUsersToSeeDeckOwnership, country, preferredCountries} = props.profile
        this.contactInfo = publicContactInfo ? publicContactInfo : ""
        this.allowUsersToSeeDeckOwnership = allowUsersToSeeDeckOwnership
        this.country = country ? country : ""
        this.preferredCountries = preferredCountries ? preferredCountries : []
        UiStore.instance.setTopbarValues(`My Profile`, "My Profile", "")
    }

    componentDidMount(): void {
        this.preferredCountriesLabelWidth = (ReactDOM.findDOMNode(this.buyingCountriesInputLabelRef) as any).offsetWidth
    }

    updateProfile = (event?: React.FormEvent) => {
        if (event) {
            event.preventDefault()
        }
        const publicContactInfo = this.contactInfo.trim().length === 0 ? undefined : this.contactInfo.trim()
        if (publicContactInfo && publicContactInfo.length > 2000) {
            MessageStore.instance.setWarningMessage("Please make your public contact info 2000 or fewer characters long.")
            return
        }
        UserStore.instance.updateUserProfile({
            publicContactInfo,
            allowUsersToSeeDeckOwnership: this.allowUsersToSeeDeckOwnership,
            country: this.country.length === 0 ? undefined : this.country,
            preferredCountries: this.preferredCountries.length === 0 ? undefined : this.preferredCountries
        })
    }

    render() {
        const profile = this.props.profile
        const filters = new DeckFilters()
        filters.owner = profile.username
        filters.includeUnregistered = true
        const decksLink = Routes.deckSearch(filters.prepareForQueryString())

        filters.forSale = true
        filters.forTrade = true
        const decksForSaleLink = Routes.deckSearch(filters.prepareForQueryString())

        return (
            <div style={{marginTop: spacing(2), display: "flex", justifyContent: "center"}}>
                <form onSubmit={this.updateProfile}>
                    <KeyCard
                        topContents={(
                            <div>
                                <Typography variant={"h4"} style={{color: "#FFFFFF", marginBottom: spacing(1)}}>{profile.username}</Typography>
                                <Typography style={{color: "#FFFFFF"}}>{profile.email}</Typography>
                            </div>
                        )}
                        style={{maxWidth: 400}}
                    >
                        <div style={{padding: spacing(2)}}>
                            <Grid container={true} spacing={16}>
                                <Grid item={true} xs={12}>
                                    <TextField
                                        label={"Public contact and trade info"}
                                        value={this.contactInfo}
                                        multiline={true}
                                        rows={4}
                                        onChange={(event) => this.contactInfo = event.target.value}
                                        fullWidth={true}
                                        variant={"outlined"}
                                        style={{marginBottom: spacing(2)}}
                                    />
                                </Grid>
                                <Grid item={true} xs={12} sm={6}>
                                    <TextField
                                        select
                                        label="Country"
                                        value={this.country}
                                        onChange={event => this.country = event.target.value}
                                        variant="outlined"
                                        fullWidth={true}
                                        style={{marginBottom: spacing(2)}}
                                    >
                                        {countries.map(country => (
                                            <MenuItem key={country} value={country}>
                                                {countryToLabel(country)}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Grid>
                                <Grid item={true} xs={12}>
                                    <FormControl style={{minWidth: 176, maxWidth: 368}} variant={"outlined"}>
                                        <InputLabel
                                            htmlFor={"buying-countries-input-id"}
                                            ref={ref => this.buyingCountriesInputLabelRef = ref}
                                        >
                                            Buying Countries
                                        </InputLabel>
                                        <Select
                                            multiple={true}
                                            value={this.preferredCountries}
                                            onChange={(event: any) => this.preferredCountries = event.target.value}
                                            input={
                                                <OutlinedInput
                                                    labelWidth={this.preferredCountriesLabelWidth}
                                                    id={"buying-countries-input-id"}
                                                />
                                            }
                                            renderValue={(selected: any) => selected.join(", ")}
                                            variant={"outlined"}
                                        >
                                            {countries.map(country => (
                                                <MenuItem key={country} value={country}>
                                                    <Checkbox checked={this.preferredCountries.indexOf(country) > -1}/>
                                                    <ListItemText primary={countryToLabel(country)}/>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item={true} xs={12}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={this.allowUsersToSeeDeckOwnership}
                                                onChange={(event) => this.allowUsersToSeeDeckOwnership = event.target.checked}
                                                tabIndex={6}
                                            />
                                        }
                                        label={"Allow anyone to see which decks I own"}
                                    />
                                    <Typography style={{marginBottom: spacing(2), marginTop: spacing(2)}}>
                                        Use the links below to share your decks with other users. You can also share the URL of any search you make.
                                    </Typography>
                                    <div style={{display: "flex"}}>
                                        {this.allowUsersToSeeDeckOwnership ? (
                                            <LinkButton color={"primary"} to={decksLink} style={{marginRight: spacing(2)}}>
                                                My Decks
                                            </LinkButton>
                                        ) : null}
                                        <LinkButton color={"primary"} to={decksForSaleLink}>
                                            For Sale and Trade
                                        </LinkButton>
                                    </div>
                                </Grid>
                            </Grid>
                            <CardActions
                                style={{paddingLeft: 0}}
                            >
                                <div style={{flexGrow: 1}}/>
                                <Button
                                    variant={"contained"}
                                    type={"submit"}
                                >
                                    Save
                                </Button>
                            </CardActions>
                        </div>
                    </KeyCard>
                </form>
            </div>
        )
    }
}
