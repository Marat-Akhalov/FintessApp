const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workout__list');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');
const modal = document.querySelector('.modal');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clickedNumber = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }

  _setDescription() {
    this.type === 'running'
      ? (this.description = `Running ${new Intl.DateTimeFormat('en-US').format(this.date)}`)
      : (this.description = `Cycling ${new Intl.DateTimeFormat('en-US').format(this.date)}`);
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, temp) {
    super(coords, distance, duration);
    this.temp = temp;
    this.calculatePace();
    this._setDescription();
  }

  calculatePace() {
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, climb) {
    super(coords, distance, duration);
    this.climb = climb;
    this.calculateSpeed();
    this._setDescription();
  }

  calculateSpeed() {
    this.speed = this.distance / this.duration;
  }
}
class App {
  #map;
  #mapEvent;

  #workouts = [];

  constructor() {
    this._getPosition();

    this._getLocalStorageData();

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleClimbField);
    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), this._handleError);
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
      foo: 'bar',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(workout => this._displayWorkout(workout));
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('form--hidden');
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputTemp.value = inputClimb.value = '';
    form.classList.add('form--hidden');
  }

  _toggleClimbField() {
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _handleError() {
    modal.classList.add('modal--active');

    modal.addEventListener('click', function (e) {
      if (e.target.classList.contains('modal__btn')) {
        location.reload();
      }

      if (e.target.closest('.modal__close')) {
        modal.classList.remove('modal--active');
      }
    });
  }

  _newWorkout(e) {
    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;

    let workout;

    const areNumbers = (...numbers) => {
      return numbers.every(num => Number.isFinite(num));
    };
    const areNumbersPositive = (...numbers) => {
      return numbers.every(num => num > 0);
    };

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    if (type === 'running') {
      const temp = +inputTemp.value;

      if (!areNumbers(distance, duration, temp) || !areNumbersPositive(distance, duration, temp)) {
        return alert('wrong');
      }

      workout = new Running([lat, lng], distance, duration, temp);
    }

    if (type === 'cycling') {
      const climb = +inputClimb.value;

      if (!areNumbers(distance, duration, climb) || !areNumbersPositive(distance, duration, climb)) {
        return alert('wrong');
      }

      workout = new Cycling([lat, lng], distance, duration, climb);
    }

    this.#workouts.push(workout);

    this._displayWorkoutOnSidebar(workout);

    this._hideForm();

    this._displayWorkout(workout);

    this._addWorkoutsToLocalStorage();
  }

  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 200,
          minWidth: 100,
          closeOnClick: false,
          autoClose: false,
          className: `${workout.type}--popup`,
        })
      )
      .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴'} ${workout.description}`)
      .openPopup();
  }

  _displayWorkoutOnSidebar(workout) {
    let html = `
    <li class="form__item train train--${workout.type}" data-id="${workout.id}">
      <h2 class="train__title">${workout.description}</h2>
      <div class="train__detail">
        <span class="train__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'}</span>
        <span class="train__value">${workout.distance}</span>
        <span class="train__unit">km</span>
      </div>
      <div class="train__detail">
        <span class="train__icon">⏲️</span>
        <span class="train__value">${workout.duration}</span>
        <span class="train__unit">min</span>
      </div>
    `;

    if (workout.type === 'running') {
      html += `
      <div class="train__detail">
          <span class="train__icon">👟</span>
          <span class="train__value">${workout.temp}</span>
          <span class="train__unit">steps/min</span>
        </div>
        <div class="train__detail">
          <span class="train__icon">⌚</span>
          <span class="train__unit">1 km /</span>
          <span class="train__value">${Math.trunc(workout.pace)} minute</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="train__detail">
          <span class="train__icon">📐</span>
          <span class="train__value">${workout.climb}</span>
          <span class="train__unit">meters</span>
        </div>
        <div class="train__detail">
          <span class="train__icon">⌚</span>
          <span class="train__value">${workout.speed.toFixed(2)}</span>
          <span class="train__unit">km/hour</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToWorkout(e) {
    const workoutElement = e.target.closest('.train');

    if (!workoutElement) return;

    const workout = this.#workouts.find(item => item.id === workoutElement.dataset.id);

    this.#map.setView(workout.coords, 14, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _addWorkoutsToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._displayWorkoutOnSidebar(workout);
    });
  }
}

const app = new App();
