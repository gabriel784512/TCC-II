import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { BLE } from '@ionic-native/ble/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  public appPages = [
    {
      title: 'Home',
      url: '/home',
      icon: 'home'
    },
    {
      title: 'Volume e Vibração',
      url: '/list',
      icon: 'md-musical-notes'
    }
  ];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private ble: BLE
  ) {
    this.initializeApp();
    this.botaoVoltar();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  botaoVoltar() {
    this.platform.backButton.subscribe(async () => {   
      this.desconectaBeacon();
      navigator['app'].exitApp();
    });
  }

  desconectaBeacon() {
    this.ble.disconnect("EB:50:91:93:CC:BA")
    .then(() => {
      console.log('Disconectando o beacon');
    }).catch(e => {
      console.log('Erro ao desconectar o beacon');
    });
  }
}
