import React, { Component } from 'react';
import FacebookLogin from 'react-facebook-login';
import { getTileCoords, distanceBetween, invert } from '../lib/utils';
import Grid from './Grid';
import Menu from './Menu';

import {
  GAME_IDLE,
  GAME_OVER,
  GAME_STARTED,
  GAME_PAUSED,
} from '../lib/game-status';
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import Snackbar from 'material-ui/Snackbar';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const encode = data => {
  return btoa(JSON.stringify(data));
};
const cleanText = text => {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

class Game extends Component {
  constructor(props) {
    super(props);

    const { numbers, tileSize, gridSize, moves, seconds } = props;
    const tiles = this.generateTiles(numbers, gridSize, tileSize);

    this.state = {
      tiles,
      gameState: GAME_IDLE,
      moves,
      seconds,
      dialogOpen: false,
      snackbarOpen: false,
      snackbarText: '',
      entrypoint: 'https://centralmedia.com.mx/facebook/cliente-nutribaby/jaguarete/entrypoint.php',
    };

    document.addEventListener('keydown', this.keyDownListener);
  }

  componentWillReceiveProps(nextProps) {
    const { tileSize, gridSize } = this.props;
    const newTiles = this.generateTiles(nextProps.numbers, gridSize, tileSize);

    this.setState({
      gameState: GAME_IDLE,
      tiles: newTiles,
      moves: 0,
      seconds: 0,
    });

    clearInterval(this.timerId);
  }

  // End game by pressing CTRL + ALT + F
  keyDownListener = key => {
    if (key.ctrlKey && key.altKey && key.code === 'KeyF') {
      const { original, gridSize, tileSize } = this.props;
      const solvedTiles = this.generateTiles(original, gridSize, tileSize).map((
        tile,
        index,
      ) => {
        tile.number = index + 1;
        return Object.assign({}, tile);
      });

      clearInterval(this.timerId);

      this.setState({
        gameState: GAME_OVER,
        tiles: solvedTiles,
        dialogOpen: true,
      });
    }
  };

  handleDialogClose = () => {
    this.setState({
      dialogOpen: false,
    });
  };

  handleSnackbarClose = reason => {
    this.setState({
      snackbarOpen: false,
    });
  };

  generateTiles(numbers, gridSize, tileSize) {
    const tiles = [];

    numbers.forEach((number, index) => {
      tiles[index] = {
        ...getTileCoords(index, gridSize, tileSize),
        width: this.props.tileSize,
        height: this.props.tileSize,
        number,
      };
    });

    return tiles;
  }

  isGameOver(tiles) {
    const correctedTiles = tiles.filter(tile => {
      return tile.tileId + 1 === tile.number;
    });

    if (correctedTiles.length === (this.props.gridSize) ** 2) {
      clearInterval(this.timerId);
      return true;
    } else {
      return false;
    }
  }

  addTimer() {
    this.setState(prevState => {
      return { seconds: prevState.seconds + 1 };
    });
  }

  setTimer() {
    this.timerId = setInterval(
      () => {
        this.addTimer();
      },
      1000,
    );
  }

  onPauseClick = () => {
    this.setState(prevState => {
      let newGameState = null;
      let newSnackbarText = null;

      if (prevState.gameState === GAME_STARTED) {
        clearInterval(this.timerId);
        newGameState = GAME_PAUSED;
        newSnackbarText = 'The game is currently paused.';
      } else {
        this.setTimer();
        newGameState = GAME_STARTED;
        newSnackbarText = 'Game on!';
      }

      return {
        gameState: newGameState,
        snackbarOpen: true,
        snackbarText: newSnackbarText,
      };
    });
  };

  onTileClick = tile => {
    if (
      !this.state.facebook ||
      this.state.gameState === GAME_OVER ||
      this.state.gameState === GAME_PAUSED
    ) {
      return;
    }

    // Set Timer in case of first click
    if (this.state.moves === 0) {
      this.setTimer();
    }

    const { gridSize } = this.props;

    // Find empty tile
    const emptyTile = this.state.tiles.find(t => t.number === gridSize ** 2);
    const emptyTileIndex = this.state.tiles.indexOf(emptyTile);

    // Find index of tile
    const tileIndex = this.state.tiles.findIndex(t => t.number === tile.number);

    // Is this tale neighbouring the zero tile? If so, switch them.
    const d = distanceBetween(tile, emptyTile);
    if (d.neighbours) {
      let t = Array.from(this.state.tiles).map(t => ({ ...t }));

      invert(t, emptyTileIndex, tileIndex, [
        'top',
        'left',
        'row',
        'column',
        'tileId',
      ]);

      const checkGameOver = this.isGameOver(t);

      this.setState({
        gameState: checkGameOver ? GAME_OVER : GAME_STARTED,
        tiles: t,
        moves: this.state.moves + 1,
        dialogOpen: checkGameOver ? true : false,
      });
    }
  };

  facebookResponse(response) {
    response.id &&
      this.setState(prevState => ({ ...prevState, facebook: response }));
    response.id &&
      fetch(this.state.entrypoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=ISO-8859-1',
        },
        body: encode({
          action: 'login',
          user_id: response.id,
          name: cleanText(response.name),
        }),
      })
        .then(res => res.json())
        .then(response =>
          this.setState(state => ({ ...state, userInfo: response })));
  }
  componentDidUpdate() {
    console.log(this.state);
  }

  onSubmit(event) {
    event.preventDefault();
    console.log(event.target.value);
  }

  render() {
    const {
      className,
      gridSize,
      tileSize,
      onResetClick,
      onNewClick,
    } = this.props;

    const actions = [
      <FlatButton label="Close" onTouchTap={this.handleDialogClose} />,
    ];

    return (
      <div className={className}>
        {!this.state.facebook &&
          <FacebookLogin
            appId="262814888001740"
            autoLoad={false}
            fields="name,email,picture"
            callback={this.facebookResponse.bind(this)}
          />}

        {this.state.facebook &&
          <Menu
            seconds={this.state.seconds}
            moves={this.state.moves}
            onResetClick={onResetClick}
            onPauseClick={this.onPauseClick}
            onNewClick={onNewClick}
            gameState={this.state.gameState}
            logged={false | this.state.facebook}
          >
            <div>
              <img src={this.state.facebook.picture.data.url} />
              <p>{this.state.facebook.name}</p>
            </div>
          </Menu>}

        {this.state.facebook &&
          this.state.userInfo &&
          <form onSubmit={el => this.onSubmit(el)}>
            <p>Completa tu registro</p>
            <input
              type="text"
              minLength={4}
              pattern="^[a-z A-Z á-ź Á-Ź]{4,100}$"
              title="inserte un nombre válido"
              placeholder="Nombre que aparece en tu  identificación oficial"
              onChange={el => {
                this.setState({
                  ...this.state,
                  fullName: el.target.value,
                });
              }}
            />
            <br />
            <input
              type="number"
              minLength={8}
              placeholder="Número de teléfono"
              pattern="^[0-9]{8,}$"
              title="inserte un número válido"
            />
            <br />
            <input
              type="text"
              minLength={5}
              pattern="^([\w\-\.]+)@((\[([0-9]{1,3}\.){3}[0-9]{1,3}\])|(([\w\-]+\.)+)([a-zA-Z]{2,4}))$"
              title="inserte un correo válido"
              placeholder="Correo"
            />
            <br />
            <button>
              Siguiente
            </button>
          </form>}
        {this.state.facebook &&
          this.state.registered &&
          <Grid
            gridSize={gridSize}
            tileSize={tileSize}
            tiles={this.state.tiles}
            onTileClick={this.onTileClick}
            logged={this.state.facebook}
          />}

        <Dialog
          title="Congrats!"
          actions={actions}
          modal={false}
          open={this.state.dialogOpen}
          onRequestClose={this.handleDialogClose}
        >
          You've solved the puzzle in{' '}
          {this.state.moves}
          {' '}moves in{' '}
          {this.state.seconds}
          {' '}seconds!
        </Dialog>
        <Snackbar
          open={this.state.snackbarOpen}
          message={this.state.snackbarText}
          onRequestClose={this.handleSnackbarClose}
        />
      </div>
    );
  }
}

Game.propTypes = {
  numbers: PropTypes.arrayOf(PropTypes.number).isRequired,
  original: PropTypes.arrayOf(PropTypes.number),
  tileSize: PropTypes.number,
  gridSize: PropTypes.number,
  moves: PropTypes.number,
  seconds: PropTypes.number,
};

Game.defaultProps = {
  tileSize: 120,
  gridSize: 4,
  moves: 0,
  seconds: 0,
};

export default styled(Game)`
  flex: 1;
`;
