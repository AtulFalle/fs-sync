import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-connection-card',
  standalone: true,
  templateUrl: './connection-card.component.html',
  styleUrl: './connection-card.component.scss',
})
export class ConnectionCardComponent {
  readonly connecting = input(false);
  readonly connect = output<void>();
}
