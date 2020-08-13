import React, {Component} from 'react';
import Typography from '@material-ui/core/Typography';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import TimerSet from './TimerSet';
import TimerIcon from '@material-ui/icons/Timer';
import KeyboardArrowRightIcon from '@material-ui/icons/KeyboardArrowRight';
import StopIcon from '@material-ui/icons/Stop';
import RotateLeftIcon from '@material-ui/icons/RotateLeft';

const useStyles = makeStyles(theme => ({
    root: {
        flexGrow: 1,
        marginTop: 20,
    },
    topGrid: {
        marginTop: 10,
        textAlign: "center",
    },
    paper: {
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    },
    button: {
        margin: theme.spacing(1),
        height: 80,
        width: 150,
    },
    setTimerButton: {
        margin: theme.spacing(1),
        marginBottom: 50
    },
    TimerInvisible: {
        color: '#f5f5f5',
    }
}));

function StyleDisplay(props) {
    const classes = useStyles();
    let buttonDisplay = "";
    let setTimerDisplay = "";

    let timer = "";

    if(props.timerVisible === true) {
        timer = <Grid item xs alignContent="center">
                        <Typography variant="h1">
                            {props.mins > 9 ? "" + props.mins : "0" + props.mins}:{props.secs > 9 ? "" + props.secs : "0" + props.secs}:{props.milis > 9 ? "" + props.milis : "0" + props.milis}
                        </Typography>
                    </Grid>
    }
    else if (props.timerVisible === false) {
        timer = <Grid item xs alignContent="center">
                    <Typography variant="h1" className={classes.TimerInvisible}>
                        {props.mins > 9 ? "" + props.mins : "0" + props.mins}:{props.secs > 9 ? "" + props.secs : "0" + props.secs}:{props.milis > 9 ? "" + props.milis : "0" + props.milis}
                    </Typography>
                </Grid>
    }

    if(props.controls === "on") {
        buttonDisplay = <Grid container spacing={3} className={classes.topGrid} justify="center" alignItems="center">
                            <Button variant="contained" size="large" color="primary" className={classes.button} onClick={props.onStartClick} endIcon={<KeyboardArrowRightIcon />}>
                                <Typography variant="h6">
                                    Start
                                </Typography>
                            </Button>
                            <Button variant="contained" size="large" color="primary" className={classes.button} onClick={props.onStopClick} endIcon={<StopIcon />}>
                                <Typography variant="h6">
                                    Stop
                                </Typography>
                            </Button>
                            <Button variant="contained" size="large" color="primary" className={classes.button} onClick={props.onResetClick} endIcon={<RotateLeftIcon />}>
                                <Typography variant="h6">
                                    Reset
                                </Typography>
                            </Button>
                        </Grid>

        setTimerDisplay = <Grid container spacing={1} className={classes.topGrid} justify="center"
                            alignItems="center" alignContent="center">
                                <Button variant="outlined" size="medium" color="primary" className={classes.setTimerButton} onClick={props.onSetTimer} endIcon={<TimerIcon />}>
                                    <Typography variant="h6">
                                        Set Timer
                                    </Typography>
                                </Button>
                            </Grid>
    }

    return(
        <div className={classes.root}>
            {buttonDisplay}
            <Grid container spacing={1} className={classes.topGrid} justify="center"
            alignItems="center" alignContent="center">
                {timer}
            </Grid>
            {setTimerDisplay}
        </div>
    );
}

class Times extends Component {
    constructor(props) {
        super(props);

        this.state = {
            mins: this.props.default[0],
            secs: this.props.default[1],
            milis: this.props.default[2],
            over: true,
            timerVisible: true,
            setTimerDialogVisible: false,
        }

        this.userValuesTimer = [this.props.default[0], this.props.default[1], this.props.default[2]];
        this.gap = 10;
        this.timeoutId = null;
        this.incrementTime = this.decrementTime.bind(this);
        this.changeTimeDisplay = this.changeTimeDisplay.bind(this);
        this.getCurTime = this.getCurTime.bind(this);
        this.blink = this.blink.bind(this);
        this.handleSetTimer = this.handleSetTimer.bind(this);
        this.handleSetTimerValues = this.handleSetTimerValues.bind(this);

        if(this.props.socket) {
            this.props.socket.on("timer_change", (data) => {
                console.log("timer_changed_caught");
                console.log(data);
                this.handleSetTimerValues(data.mins, data.secs, data.milis);
            });
        }

    }

    async blink() {
        for(let i = 0; i < 2; i++) {
            this.setState({timerVisible: false});
            await new Promise(r => setTimeout(r, 200));
            
            this.setState({timerVisible: true});
            await new Promise(r => setTimeout(r, 200));
        }
    }

    getCurTime() {
        this.props.saveTime(this.state.mins, this.state.secs, this.state.milis);
    }

    handleStartClick() {
        if(this.timeoutId == null) {
            let nextAt = new Date().getTime() + this.gap;
            this.setState({over: false});
            this.timeoutId = setTimeout(this.decrementTime(this.gap, nextAt), nextAt - new Date().getTime());
        }

        if(this.props.socket)
            this.props.socket.send('timer_start');
    }

    handleStopClick() {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
        this.setState({over: true});

        if(this.props.socket)
            this.props.socket.send('timer_stop');
    }

    handleResetClick() {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
        this.setState({over: true});
        this.setState({mins: this.userValuesTimer[0], secs: this.userValuesTimer[1], milis: this.userValuesTimer[2]});
        this.props.onResetClick();

        if(this.props.socket)
            this.props.socket.send('timer_reset');
    }

    changeTimeDisplay(gap_milis) {
        let {mins, secs, milis} = this.state;
        milis = milis - gap_milis;
        if(milis < 0) {
            secs = secs + Math.floor(milis / 100);
            milis = (100 - Math.abs(milis % 100))%100;
            if(secs < 0) {
                mins = mins + Math.floor(secs / 60);
                secs = (60 - Math.abs(secs % 60))%60;
         
              	if(mins <= 0) {
                    console.log("Over!");
                    this.blink();
                    return "countdown_over";
                }
            }
        }

        this.setState({mins: mins, secs: secs, milis: milis});
        return "successful";
    }

    decrementTime(gap, nextAt) {
        nextAt += gap;
        let interval = Date.now() - nextAt;
        let change_milis = 1;

        if(interval > gap) {
            let passes = Math.floor(interval/gap);
            nextAt = nextAt + (passes+1)*gap;
            change_milis = change_milis + passes + 1;
        }

        let changed = this.changeTimeDisplay(change_milis);

        if(changed === "countdown_over") {
            this.handleStopClick();
        }
        else if(changed === "successful"){
            this.timeoutId = setTimeout(() => this.decrementTime(gap, nextAt), nextAt - new Date().getTime());
        }
    }

    handleSetTimer() {
        this.setState({setTimerDialogVisible: true});
        // this.userValuesTimer = [mins, secs, milis];
        // this.setState({mins: mins, secs: secs, milis: milis});
    }

    handleSetTimerValues(mins, secs, milis) {
        this.userValuesTimer = [mins, secs, milis];
        this.setState({mins: mins, secs: secs, milis: milis});
        this.setState({setTimerDialogVisible: false});
        this.props.saveTime(this.state.mins, this.state.secs, this.state.milis);

        if(this.props.controls === "on"){
            console.log("timer_changed_Sent");
            this.props.socket.emit("timer_change", {mins: mins, secs: secs, milis: milis});
        }
    }

    render() {
        let setTimerDialog = '';
        if(this.state.setTimerDialogVisible === true) {
            setTimerDialog = <TimerSet timerInfo={(mins, secs, milis) => {this.handleSetTimerValues(mins, secs, milis)}} default={[this.state.mins, this.state.secs, this.state.milis]}></TimerSet>
        }
        return (
            <div>
                <StyleDisplay mins={this.state.mins} secs={this.state.secs} milis={this.state.milis} onStartClick={() => this.handleStartClick()} onStopClick={() => this.handleStopClick()}  onResetClick={() => this.handleResetClick()} controls={this.props.controls} timerVisible={this.state.timerVisible} onSetTimer={() => this.handleSetTimer()}/>
                {setTimerDialog}
            </div>
        ); 
    }
}

export default Times;