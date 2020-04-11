import React, { Fragment } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Container, Row, Col } from 'react-bootstrap';

import chesh02 from './db/chesh02.txt';
import chesh03 from './db/chesh03.txt';
import euro13sh from './db/euro13sh.txt';
import euro14sh from './db/euro14sh.txt';
import euro15sh from './db/euro15sh.txt';
import more11 from './db/more11.txt';


const GAMES_LIST = {
  chesh02,
  chesh03,
  euro13sh,
  euro14sh,
  euro15sh,
  more11
};

const TIMER_END_OFFSET = 4;
const PREPARE_TIME = 3;
const READ_TIME = 3;
const ANSWER_TIME = 60;
const RIGHT_ANSWER_TIME = 0;

const log = console.log;
const error = console.error;

const timerEndBeep = new Audio('/sounds/Clock-alarm-electronic-beep.mp3');

const statuses = {
  selectGame: 'SELECT_GAME',
  selectTournament: 'SELECT_TOURNAMENT',
  prepare: 'PREPARE_FOR_GAME',
  read: 'READ_QUESTION',
  answer: 'ANSWER_QUESTION',
  rightAnswer: 'RIGHT_ANSWER',
  gameOver: 'GAME_OVER'
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      status: statuses.selectGame,
      games: {},
      tournaments: [],
      currentGame: null,
      currentTournament: null,
      currentQuestion: null,
      timeOver: false,
      prepareTime: PREPARE_TIME,
      readTime: READ_TIME,
      answerTime: ANSWER_TIME,
      rightAnswerTime: RIGHT_ANSWER_TIME
    }
  }

  loadGames = () => {
    const games = {};
    Object.keys(GAMES_LIST).forEach(game => {
      fetch(GAMES_LIST[game])
      .then(res => res.text())
      .then(text  => {
        let tournamentId;
        let questionId;
        let imgs = [];
        let currentlyReading = '';
        let updatingObj = games[game] = {};
        const lines = text.split('\n');

        Promise.all(
          lines.map(line => {
            line = line.trim();
            if (line === '') {
              currentlyReading = '';
            } else {
              if(line.match(/(pic: [0-9]*.jpg)/)) {
                updatingObj[currentlyReading] +=
                  '<br /><img src="https://db.chgk.info/images/db/' + 
                  line.replace('(pic: ', '').replace(')', '') +
                  '" alt="" class="py-4"/><br />';
                line = ' '
              }
              if(currentlyReading !== '')
                updatingObj[currentlyReading] += ' ' + line;
              
              if (line === 'Чемпионат:') {
                tournamentId = 0;
                currentlyReading = 'gameTitle'
                updatingObj[currentlyReading] = '';
              } else if (line === 'Тур:') {
                if (tournamentId > 0) {
                  games[game]['tournament_' + tournamentId]['numOfQuestions'] = questionId;
                  games[game]['numOfTournaments'] = tournamentId + 1;
                }
                tournamentId++;
                questionId = 0;
                updatingObj = games[game]['tournament_' + tournamentId] = {};
                currentlyReading = 'tournamentTitle'
                updatingObj[currentlyReading] = '';
              } else if (line.match(/Вопрос [0-9]*:/)) {
                questionId++;
                updatingObj = 
                  games[game]['tournament_' + tournamentId]['question_' + questionId] = {
                    question: '', answer: '', comment: ''
                  };
                currentlyReading = 'question';
              } else if (line === 'Ответ:') {
                currentlyReading = 'answer';
              } else if (line === 'Комментарий:') {
                currentlyReading = 'comment';
              }
            }
          })
        )
        .then(() => this.setState({ games }))
        .catch(err => error("Error loading games", err))
      });
    });
  }

  loadTournaments = (gameId) => {
    const tournaments = [];
    const game = this.state.games[gameId];
    const { numOfTournaments } = game;

    if (!numOfTournaments) {
      error("Error loading game", gameId);
    }

    for (let i = 1; i < numOfTournaments + 1; i++) {
      tournaments.push(game['tournament_' + i]);
    }

    this.setState({ tournaments });
  }

  componentDidMount() {
    this.loadGames();
  }

  runTimer = (timerState, timerDefault, soundBeep = false) => {
    const timer = setInterval(() => {
      this.setState({
        [timerState]: this.state[timerState] - 1,
        timeOver: false
      });
      if(
        soundBeep &&
        this.state[timerState] <= TIMER_END_OFFSET &&
        this.state[timerState] >= 1
      ) {
        timerEndBeep.play();
      }
      if (this.state[timerState] <= 0) {
        clearInterval(timer);
        this.setState({
          [timerState]: timerDefault,
          timeOver: true
        })
      }
    }, 1000);
  }

  renderTopic = () => {
    const { currentTournament, currentQuestion } = this.state;
    let { numOfQuestions } = currentTournament;
    numOfQuestions = numOfQuestions || 0;

    return (
      <Col>
        <h1>
          {
            currentQuestion > 1 &&
            <span
              className="mr-4 skip"
              style={{ transform: "rotate(180deg)" }}
              onClick={() => {
                this.setState({
                  status: statuses.read,
                  currentQuestion: currentQuestion - 1,
                  timeOver: false
                }, () => this.runTimer('readTime', READ_TIME));
              }}
            >
              &lt;&lt;
            </span>
          }
          {
            this.state.status === statuses.rightAnswer ?
              `Ответ ${currentQuestion}/${numOfQuestions}` :
              `Вопрос ${currentQuestion}/${numOfQuestions}`
          }
          {
            currentQuestion < numOfQuestions &&
            <span
              className="ml-4 skip"
              style={{ transform: "rotate(180deg)" }}
              onClick={() => {
                this.setState({
                  status: statuses.read,
                  currentQuestion: currentQuestion + 1,
                  timeOver: false
                }, () => this.runTimer('readTime', READ_TIME));
              }}
            >
              &gt;&gt;
            </span>
          }
        </h1>
      </Col>
    )
  }

  render() {
    const {
      games,
      tournaments
    } = this.state;

    if (this.state.status === statuses.selectGame) {
      return (
        <Container className="App" fluid>
          <Fragment>
            <Row className="py-4">
              <Col>
                <h1>Выберите игру</h1>
              </Col>
            </Row>
            {
              Object.keys(games).map((gameKey, i) => {
                const game = games[gameKey];
                if (!game || !game.gameTitle) return null;
      
                return (
                  <Row key={`${game.gameTitle}_${i}`}>
                    <Col>
                      <h3 className="anchor pb-2" onClick={() => {
                        this.loadTournaments(gameKey);
                        this.setState({
                          currentGame: game,
                          status: statuses.selectTournament
                        });
                      }}>
                        {game.gameTitle}
                      </h3>
                    </Col>
                  </Row>
                )
              })
            }
          </Fragment>
        </Container>
      );
    } else if (this.state.status === statuses.selectTournament) {
      return (
        <Container className="App" fluid>
          <Fragment>
            <Row className="py-4">
              <Col>
                <h1>Выберите тур</h1>
              </Col>
            </Row>
            {
              tournaments.map((tournament, i) => {
                if (!tournament || !tournament.tournamentTitle) return null;
      
                return (
                  <Row key={`${tournament.tournamentTitle}_${i}`}>
                    <Col>
                      <h3 className="anchor pb-2" onClick={() => {
                        this.setState({
                          currentTournament: tournament,
                          status: statuses.prepare,
                          timeOver: false
                        }, () => this.runTimer('prepareTime', PREPARE_TIME));
                      }}>
                        {tournament.tournamentTitle}
                      </h3>
                    </Col>
                  </Row>
                )
              })
            }
          </Fragment>
        </Container>
      );
    }
    if (this.state.status === statuses.prepare) {
      return (
        <Container className="App" fluid>
          <Fragment>
            <Row className="py-4">
              <Col>
                {
                  !this.state.timeOver ?
                    <h1>Начинаем через</h1> :
                    <h1>Жми и поехали!</h1>
                }
              </Col>
            </Row>
            <Row className="py-4">
              <Col className="prepare-timer timer">
              {
                !this.state.timeOver ?
                  <div 
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      this.setState({
                        prepareTime: 0
                      });
                    }}
                  >
                    {this.state.prepareTime}
                  </div> :
                  <div className="anchor" onClick={() => {
                    this.setState({
                      currentQuestion: 1,
                      status: statuses.read,
                      timeOver: false
                    }, () => this.runTimer('readTime', READ_TIME));
                  }}>
                    ▶
                  </div>
              }
              </Col>
            </Row>
          </Fragment>
        </Container>
      );
    }
    if (this.state.status === statuses.read) {
      const { currentTournament, currentQuestion } = this.state;
      const { numOfQuestions } = currentTournament;
      const question = currentTournament['question_' + currentQuestion];

      return (
        <Container className="App px-4" fluid>
          <Fragment>
            <Row className="py-4">
              { this.renderTopic() }
            </Row>
            <Row className="py-4">
              <Col>
                {
                  !this.state.timeOver ?
                  <h1 className="pb-2 timer">
                    Читаем вопрос...
                  </h1> :
                  <h1 className="anchor pb-2" onClick={(e) => {
                    this.setState({
                      status: statuses.answer,
                      timeOver: false
                    }, () => this.runTimer('answerTime', ANSWER_TIME, true));
                  }}>
                    ▶
                  </h1>
                }
                <h3 dangerouslySetInnerHTML={{ __html: question.question }} />
              </Col>
            </Row>
          </Fragment>
        </Container>
      );
    }
    if (this.state.status === statuses.answer) {
      const { currentTournament, currentQuestion } = this.state;
      const { numOfQuestions } = currentTournament;
      const question = currentTournament['question_' + currentQuestion];

      return (
        <Container className="App px-4" fluid>
          <Fragment>
            <Row className="py-4">
              { this.renderTopic() }
            </Row>
            <Row className="py-4">
              <Col>
                {
                  !this.state.timeOver ?
                  <h1
                    className="pb-2 timer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      this.setState({
                        answerTime: 0
                      });
                    }}
                  >
                    {this.state.answerTime}
                  </h1> :
                  <h1 className="anchor pb-2" onClick={() => {
                    this.setState({
                      status: statuses.rightAnswer,
                      timeOver: false
                    }, () => this.runTimer('rightAnswerTime', RIGHT_ANSWER_TIME));
                  }}>
                    ▶
                  </h1>
                }
                <h3 dangerouslySetInnerHTML={{ __html: question.question }} />
              </Col>
            </Row>
          </Fragment>
        </Container>
      );
    }
    if (this.state.status === statuses.rightAnswer) {
      const { currentTournament, currentQuestion } = this.state;
      const { numOfQuestions } = currentTournament;
      const question = currentTournament['question_' + currentQuestion];

      return (
        <Container className="App px-4" fluid>
          <Fragment>
            <Row className="py-4">
              { this.renderTopic() }
            </Row>
            <Row className="py-4">
              <Col>
                {
                  !this.state.timeOver ?
                  <h1 className="pb-2 timer">
                    {this.state.rightAnswerTime}
                  </h1> :
                  <h1 className="anchor pb-2" onClick={() => {
                    this.setState({
                      currentQuestion: currentQuestion + 1,
                      status:
                        currentQuestion === numOfQuestions ? statuses.gameOver : statuses.read,
                      timeOver: false
                    }, () => this.runTimer('readTime', READ_TIME));
                  }}>
                    ▶
                  </h1>
                }
                <h3 dangerouslySetInnerHTML={{ __html: question.question }} />
                <h3 className="answer pt-4" dangerouslySetInnerHTML={{ __html: question.answer }} />
                {
                  question.comment &&
                    <h5 className="answer py-4" dangerouslySetInnerHTML={{ __html: question.comment }} />
                }
              </Col>
            </Row>
          </Fragment>
        </Container>
      );
    }
    if (this.state.status === statuses.gameOver) {
      return (
        <Container className="App px-4" fluid>
          <Fragment>
            <Row className="py-4">
              <Col>
                <h1>Игра завершена!</h1>
              </Col>
            </Row>
            <Row className="py-4">
              <Col className="prepare-timer timer">
                <a href="/" className="anchor">
                  Ещё!
                </a>
              </Col>
            </Row>
          </Fragment>
        </Container>
      );
    }
    return null;
  }
}

export default App;
